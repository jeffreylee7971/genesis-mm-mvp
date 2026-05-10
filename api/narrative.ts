import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "http";

const client = new Anthropic();

function buildPrompt(viewer: Record<string, any>, candidate: Record<string, any>): string {
  const fmt = (label: string, val: string | null | undefined) =>
    val ? `- ${label}: "${val}"` : "";

  const profileBlock = (p: Record<string, any>) =>
    [
      fmt("Family timeline", p.family_timeline),
      p.children_wanted != null ? `- Wants ${p.children_wanted} children` : "",
      fmt("Sunday morning vision", p.open_text_sunday),
      fmt("On being a great parent", p.open_text_parenting),
      fmt("Nervous / excited about", p.open_text_future),
      fmt("Bio", p.bio),
    ]
      .filter(Boolean)
      .join("\n");

  return [
    `${viewer.name} (the viewer):`,
    profileBlock(viewer),
    "",
    `${candidate.name}:`,
    profileBlock(candidate),
  ].join("\n");
}

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

  let viewer: Record<string, any>;
  let candidate: Record<string, any>;
  try {
    const raw = await readBody(req);
    ({ viewer, candidate } = JSON.parse(raw));
    if (!viewer?.name || !candidate?.name) throw new Error("missing profiles");
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "viewer and candidate profiles required" }));
    return;
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: {
        type: "text",
        text: `You are a warm, thoughtful matchmaker writing a brief compatibility note for a serious dating app called Genesis — focused on people ready for marriage and family.

Write 2–3 sentences explaining why these two people would connect well, based on their actual answers. Be specific: reference what they actually said, not generic values. Write in second person addressed to the viewer ("You and [name]…"). Tone: warm, grounded, a little literary — like a wise friend who knows both people. Never use clichés like "kindred spirits", "perfect match", or "journey". Do not sound like AI.`,
        // @ts-ignore — cache_control is supported but not yet in the type definitions
        cache_control: { type: "ephemeral" },
      },
      messages: [{ role: "user", content: buildPrompt(viewer, candidate) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    res.statusCode = 200;
    res.end(JSON.stringify({ narrative: text }));
  } catch (e: any) {
    console.error("narrative generation failed:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message ?? "generation failed" }));
  }
}
