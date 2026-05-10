import type { ViewerProfile, CandidateProfile } from "@/lib/matching";
import { placeholderNarrative } from "@/lib/matching";

export async function generateNarrative(
  viewer: ViewerProfile,
  candidate: CandidateProfile,
): Promise<string> {
  try {
    const res = await fetch("/api/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewer, candidate }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { narrative } = await res.json();
    if (typeof narrative === "string" && narrative.length > 0) return narrative;
    throw new Error("empty response");
  } catch {
    // Fall back to rule-based narrative if the API is unavailable
    return placeholderNarrative(viewer, candidate);
  }
}
