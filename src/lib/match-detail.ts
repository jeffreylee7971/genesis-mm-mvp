import type { CandidateProfile, ViewerProfile } from "@/lib/matching";

export type MatchStatus = "pending" | "mutual" | "connected" | "passed";

export type MatchRow = {
  id: string;
  status: MatchStatus;
  initiator: string | null;
};

export type MatchDetailViewState = "loading" | "viewer-unavailable" | "candidate-unavailable" | "ready";
export type MatchCtaState = "message" | "interest-expressed" | "express-interest";

export function getMatchDetailViewState({
  loaded,
  viewer,
  candidate,
}: {
  loaded: boolean;
  viewer: ViewerProfile | null;
  candidate: CandidateProfile | null;
}): MatchDetailViewState {
  if (!loaded) return "loading";
  if (!viewer) return "viewer-unavailable";
  if (!candidate) return "candidate-unavailable";
  return "ready";
}

export function getMatchCtaState(matchRow: MatchRow | null, userId?: string): MatchCtaState {
  if (matchRow?.status === "mutual" || matchRow?.status === "connected") return "message";
  if (matchRow?.status === "pending" && matchRow.initiator === userId) return "interest-expressed";
  return "express-interest";
}