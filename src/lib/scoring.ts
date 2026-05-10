export async function triggerProfileScoring(userId: string): Promise<void> {
  try {
    await fetch("/api/score-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch {
    // Fire-and-forget — silently ignore errors
  }
}

export async function triggerXScoring(userId: string, xHandle: string): Promise<void> {
  if (!xHandle.trim()) return;
  try {
    await fetch("/api/score-x-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, x_handle: xHandle }),
    });
  } catch {
    // Fire-and-forget — silently ignore errors
  }
}
