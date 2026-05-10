import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

const GROK_API_KEY = process.env.GROK_API_KEY ?? "";
const GROK_MODEL = process.env.GROK_MODEL ?? "grok-3-mini";
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SYSTEM_PROMPT = `You are a relationship psychologist scoring a dating profile for family-formation readiness. Read the following three open-text answers and score the person on four dimensions (0–100 each):

- emotional_maturity: can name feelings, shows self-awareness, acknowledges vulnerability
- growth_mindset: shows openness to learning and change as a parent/partner
- responsibility_orientation: takes ownership, thinks about others' needs, plans ahead
- values_alignment: describes family life with warmth, specificity, and intentionality

Pay special attention to the third answer — willingness to name a fear or uncertainty is a strong positive signal for emotional maturity.

Return JSON only: {"emotional_maturity": int, "growth_mindset": int, "responsibility_orientation": int, "values_alignment": int, "summary": "one sentence"}`;

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!GROK_API_KEY) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Grok API not configured" }));
    return;
  }

  let user_id: string;
  try {
    ({ user_id } = JSON.parse(await readBody(req)));
    if (!user_id) throw new Error("missing user_id");
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "user_id required" }));
    return;
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: profile } = await sb
      .from("profiles")
      .select("open_text_sunday, open_text_parenting, open_text_future")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile?.open_text_sunday && !profile?.open_text_parenting && !profile?.open_text_future) {
      res.statusCode = 422;
      res.end(JSON.stringify({ error: "no open-text answers to score" }));
      return;
    }

    const userContent = [
      profile.open_text_sunday ? `1. Ideal Sunday morning as a family:\n"${profile.open_text_sunday}"` : null,
      profile.open_text_parenting ? `2. What being a great parent means:\n"${profile.open_text_parenting}"` : null,
      profile.open_text_future ? `3. Looking forward to / nervous about:\n"${profile.open_text_future}"` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!grokRes.ok) {
      const err = await grokRes.text();
      throw new Error(`Grok API error ${grokRes.status}: ${err}`);
    }

    const grokJson = await grokRes.json();
    const raw = grokJson.choices?.[0]?.message?.content ?? "{}";
    const scores = JSON.parse(raw);

    await sb.from("profiles").update({ semantic_scores: scores }).eq("user_id", user_id);

    res.statusCode = 200;
    res.end(JSON.stringify({ semantic_scores: scores }));
  } catch (e: any) {
    console.error("score-profile failed:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message ?? "scoring failed" }));
  }
}
