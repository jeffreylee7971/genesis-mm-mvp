// Helpers for the dashboard's curated daily matches.
// In a real product, the matching engine would run server-side. For the MVP we
// surface other onboarded users (excluding the viewer) and compute a simple
// rule-based compatibility view from their answers.

import { supabase } from "@/integrations/supabase/client";
import { TIMELINE_OPTIONS } from "@/lib/onboarding-config";

export type CandidateProfile = {
  user_id: string;
  name: string;
  age: number | null;
  city: string | null;
  photos: string[];
  family_timeline: string | null;
  children_current: number | null;
  children_wanted: number | null;
  open_to_existing_children: string | null;
  parenting_philosophy: Record<string, string>;
  lifestyle: Record<string, string>;
  relationship_structure: string | null;
  attachment_signals: Record<string, string>;
  open_text_sunday: string | null;
  open_text_parenting: string | null;
  open_text_future: string | null;
  bio: string | null;
};

export type ViewerProfile = CandidateProfile;

export const timelineLabel = (v: string | null | undefined) =>
  TIMELINE_OPTIONS.find((o) => o.value === v)?.label ?? "Open";

// Block when both users have explicitly answered "no" to existing children.
export function passesExistingChildrenFilter(viewer: ViewerProfile, c: CandidateProfile) {
  const viewerNo = viewer.open_to_existing_children === "no";
  const candidateNo = c.open_to_existing_children === "no";
  const viewerHasKids = (viewer.children_current ?? 0) > 0;
  const candidateHasKids = (c.children_current ?? 0) > 0;
  if (viewerNo && candidateHasKids) return false;
  if (candidateNo && viewerHasKids) return false;
  return true;
}

export function categoryAlignment(viewer: ViewerProfile, c: CandidateProfile) {
  const overlap = (a?: Record<string, string>, b?: Record<string, string>) => {
    const keys = Object.keys(a ?? {});
    if (!keys.length) return 0;
    const same = keys.filter((k) => a?.[k] && a[k] === b?.[k]).length;
    return same / keys.length;
  };

  const timeline = viewer.family_timeline === c.family_timeline ? 1 : 0.5;
  const parenting = overlap(viewer.parenting_philosophy, c.parenting_philosophy);
  const lifestyle = overlap(viewer.lifestyle, c.lifestyle);
  // values: relationship structure + children_wanted closeness
  let valuesScore = 0;
  if (viewer.relationship_structure && viewer.relationship_structure === c.relationship_structure) valuesScore += 0.5;
  if (viewer.children_wanted != null && c.children_wanted != null) {
    valuesScore += 0.5 * (1 - Math.min(1, Math.abs(viewer.children_wanted - c.children_wanted) / 4));
  }

  const score = Math.round((timeline * 0.25 + parenting * 0.3 + lifestyle * 0.25 + valuesScore * 0.2) * 100);
  return { timeline, parenting, lifestyle, values: valuesScore, score };
}

export function highlightFor(viewer: ViewerProfile, c: CandidateProfile) {
  if (viewer.family_timeline && viewer.family_timeline === c.family_timeline)
    return `Both hoping to start a family ${timelineLabel(c.family_timeline).toLowerCase()}`;
  if (
    viewer.children_wanted != null &&
    c.children_wanted != null &&
    viewer.children_wanted === c.children_wanted
  )
    return `Both want ${c.children_wanted} ${c.children_wanted === 1 ? "child" : "children"}`;
  if (
    viewer.relationship_structure &&
    viewer.relationship_structure === c.relationship_structure
  )
    return `Aligned on relationship structure`;
  return `Shared values worth exploring`;
}

export async function fetchViewerFull(userId: string): Promise<ViewerProfile | null> {
  const [{ data: meta }, { data: profile }] = await Promise.all([
    supabase.from("users_meta").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!meta || !profile) return null;
  return {
    user_id: userId,
    name: meta.name,
    age: meta.age,
    city: meta.city,
    photos: meta.photos ?? [],
    family_timeline: profile.family_timeline,
    children_current: profile.children_current,
    children_wanted: profile.children_wanted,
    open_to_existing_children: profile.open_to_existing_children,
    parenting_philosophy: (profile.parenting_philosophy as any) ?? {},
    lifestyle: (profile.lifestyle as any) ?? {},
    relationship_structure: profile.relationship_structure,
    attachment_signals: (profile.attachment_signals as any) ?? {},
    open_text_sunday: profile.open_text_sunday,
    open_text_parenting: profile.open_text_parenting,
    open_text_future: profile.open_text_future,
    bio: profile.bio,
  };
}

// Best-effort placeholder narrative — in production, Step 2 swaps this for Claude.
export function placeholderNarrative(viewer: ViewerProfile, c: CandidateProfile) {
  const wantSame =
    viewer.children_wanted != null &&
    c.children_wanted != null &&
    viewer.children_wanted === c.children_wanted;
  const timelineSame = viewer.family_timeline === c.family_timeline;
  const faithSame = viewer.parenting_philosophy?.faith === c.parenting_philosophy?.faith;
  const parts: string[] = [];
  if (timelineSame) parts.push(`you're both on a ${timelineLabel(c.family_timeline).toLowerCase()} timeline`);
  if (wantSame) parts.push(`you both want ${c.children_wanted} children`);
  if (faithSame && c.parenting_philosophy?.faith) parts.push(`you share a similar view on faith in family life`);
  const base = parts.length
    ? `You both prioritize building a real life together — ${parts.join(", ")}.`
    : `Your answers suggest a thoughtful overlap in how you imagine family life.`;
  return `${base} Worth a slow conversation.`;
}
