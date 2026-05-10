import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

const GROK_API_KEY = process.env.GROK_API_KEY ?? "";
const GROK_MODEL = process.env.GROK_MODEL ?? "grok-3-mini";
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SYSTEM_PROMPT = `You are analyzing a public X (Twitter) profile to assess genuine family-formation readiness. Look for content about building a future, relationships, parenting, community, and purpose. Penalize defensive independence content ('I don't need anyone'), complaint loops about dating, and engagement-bait. Return JSON only: {"readiness_score": 0-100, "signals": ["positive signal 1", ...], "flags": ["concern 1", ...]}. Be nuanced — someone can post relationship frustrations and still be ready.`;

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
  let x_handle: string;
  try {
    ({ user_id, x_handle } = JSON.parse(await readBody(req)));
    if (!user_id || !x_handle) throw new Error("missing fields");
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "user_id and x_handle required" }));
    return;
  }

  // Normalize handle — strip leading @
  const handle = x_handle.replace(/^@/, "");

  try {
    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        response_format: { type: "json_object" },
        // Live X search — Grok fetches public posts for the handle
        search_parameters: {
          mode: "on",
          sources: [{ type: "x" }],
          x_handles: [handle],
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze the X (Twitter) profile @${handle} and their recent public posts. Based on their content, tone, and topics, assess their readiness for family formation.`,
          },
        ],
      }),
    });

    if (!grokRes.ok) {
      const err = await grokRes.text();
      throw new Error(`Grok API error ${grokRes.status}: ${err}`);
    }

    const grokJson = await grokRes.json();
    const raw = grokJson.choices?.[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);
    const readiness_score: number = Math.round(
      Math.max(0, Math.min(100, Number(result.readiness_score ?? 50)))
    );

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await sb.from("profiles").update({ x_readiness_signal: readiness_score }).eq("user_id", user_id);

    res.statusCode = 200;
    res.end(JSON.stringify({ x_readiness_signal: readiness_score, signals: result.signals ?? [], flags: result.flags ?? [] }));
  } catch (e: any) {
    console.error("score-x-profile failed:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message ?? "X scoring failed" }));
  }
}
