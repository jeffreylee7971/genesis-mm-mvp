import { describe, expect, it } from "vitest";
import { getMatchCtaState, getMatchDetailViewState, type MatchRow } from "@/lib/match-detail";
import type { CandidateProfile, ViewerProfile } from "@/lib/matching";

const viewer: ViewerProfile = {
  user_id: "viewer",
  name: "Maya",
  age: 31,
  city: "New York",
  photos: [],
  family_timeline: null,
  children_current: 0,
  children_wanted: 2,
  open_to_existing_children: "open",
  parenting_philosophy: {},
  lifestyle: {},
  relationship_structure: null,
  attachment_signals: {},
  open_text_sunday: null,
  open_text_parenting: null,
  open_text_future: null,
  bio: null,
};

const candidate: CandidateProfile = {
  ...viewer,
  user_id: "candidate",
  name: "Daniel",
};

describe("getMatchDetailViewState", () => {
  it("stays loading until the fetch completes", () => {
    expect(getMatchDetailViewState({ loaded: false, viewer, candidate })).toBe("loading");
  });

  it("shows a viewer-unavailable state instead of spinning forever when viewer data is missing", () => {
    expect(getMatchDetailViewState({ loaded: true, viewer: null, candidate })).toBe("viewer-unavailable");
  });

  it("shows a candidate-unavailable state when the target profile cannot be read", () => {
    expect(getMatchDetailViewState({ loaded: true, viewer, candidate: null })).toBe("candidate-unavailable");
  });

  it("becomes ready when both profiles are available", () => {
    expect(getMatchDetailViewState({ loaded: true, viewer, candidate })).toBe("ready");
  });
});

describe("getMatchCtaState", () => {
  it("shows message for mutual matches", () => {
    const row: MatchRow = { id: "1", status: "mutual", initiator: "viewer" };
    expect(getMatchCtaState(row, "viewer")).toBe("message");
  });

  it("shows interest expressed only to the initiator on a pending row", () => {
    const row: MatchRow = { id: "1", status: "pending", initiator: "viewer" };
    expect(getMatchCtaState(row, "viewer")).toBe("interest-expressed");
  });

  it("shows express interest to the other side of a pending row", () => {
    const row: MatchRow = { id: "1", status: "pending", initiator: "viewer" };
    expect(getMatchCtaState(row, "candidate")).toBe("express-interest");
  });

  it("shows express interest when there is no match row yet", () => {
    expect(getMatchCtaState(null, "viewer")).toBe("express-interest");
  });
});