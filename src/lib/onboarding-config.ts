// All onboarding question definitions, copy, and types in one place.

export const PARENTING_QUESTIONS = [
  {
    key: "discipline",
    label: "Discipline approach",
    options: [
      { value: "firm", label: "Firm boundaries" },
      { value: "collaborative", label: "Collaborative" },
      { value: "relaxed", label: "Relaxed" },
      { value: "figuring", label: "Still figuring it out" },
    ],
  },
  {
    key: "education",
    label: "Education values",
    options: [
      { value: "public", label: "Public school" },
      { value: "private", label: "Private" },
      { value: "homeschool", label: "Homeschool" },
      { value: "open", label: "Open to anything" },
    ],
  },
  {
    key: "division",
    label: "Division of parenting",
    options: [
      { value: "traditional", label: "Traditional roles" },
      { value: "shared", label: "Fully shared" },
      { value: "flexible", label: "Flexible" },
      { value: "later", label: "Discuss when we get there" },
    ],
  },
  {
    key: "faith",
    label: "Faith in family life",
    options: [
      { value: "central", label: "Central" },
      { value: "present", label: "Present but not defining" },
      { value: "none", label: "Not a factor" },
      { value: "partner", label: "Partner's call" },
    ],
  },
] as const;

export const LIFESTYLE_QUESTIONS = [
  {
    key: "location",
    label: "Location permanence",
    options: [
      { value: "rooted", label: "Rooted here for the long term" },
      { value: "open_move", label: "Open to relocating for family" },
      { value: "city_lover", label: "City lover, won't move" },
      { value: "exploring", label: "Still exploring where to settle" },
    ],
  },
  {
    key: "finances",
    label: "Financial approach",
    options: [
      { value: "save_first", label: "Save first, experience later" },
      { value: "experience_first", label: "Experience now, save smartly" },
      { value: "balanced", label: "Balanced month-to-month" },
      { value: "discuss", label: "Open to figuring it out together" },
    ],
  },
  {
    key: "balance",
    label: "Work–life balance",
    options: [
      { value: "family_first", label: "Family always comes first" },
      { value: "career_driven", label: "Career-driven, makes time" },
      { value: "flex", label: "Flexible by season" },
      { value: "simple", label: "Quiet, simple life" },
    ],
  },
  {
    key: "extended_family",
    label: "Extended family involvement",
    options: [
      { value: "very_close", label: "Very close — see them often" },
      { value: "respectful_distance", label: "Respectful distance" },
      { value: "depends", label: "Depends on the relationship" },
      { value: "limited", label: "Limited by choice" },
    ],
  },
] as const;

export const ATTACHMENT_QUESTIONS = [
  {
    key: "hard_times",
    label: "When things get hard in a relationship, I tend to:",
    options: [
      { value: "talk", label: "Talk it through immediately" },
      { value: "space", label: "Need space first" },
      { value: "shutdown", label: "Shut down" },
      { value: "depends", label: "It depends" },
    ],
  },
  {
    key: "secure_when",
    label: "I feel most secure in a relationship when:",
    options: [
      { value: "checkin", label: "My partner checks in often" },
      { value: "trust", label: "We have our own lives and trust each other" },
      { value: "routines", label: "We've built clear routines" },
      { value: "figuring", label: "I'm still figuring this out" },
    ],
  },
  {
    key: "after_disagreement",
    label: "After a disagreement, I prefer to:",
    options: [
      { value: "resolve_fast", label: "Resolve it before the day ends" },
      { value: "cool_off", label: "Take a day to cool off" },
      { value: "let_go", label: "Let it go naturally" },
      { value: "depends", label: "Depends on the issue" },
    ],
  },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "within_1_year", label: "Within 1 year" },
  { value: "1_to_2_years", label: "1–2 years" },
  { value: "2_to_4_years", label: "2–4 years" },
  { value: "open_but_serious", label: "Open but serious" },
] as const;

export const RELATIONSHIP_OPTIONS = [
  { value: "traditional_marriage", label: "Traditional marriage" },
  { value: "open_to_alternatives", label: "Open to alternatives" },
  { value: "either", label: "Either" },
] as const;

export const SECTION_INTROS: Record<string, string> = {
  parenting:
    "The way people approach parenting is one of the most important compatibility factors for long-term family happiness. These questions help us find someone whose approach truly aligns with yours.",
  lifestyle:
    "Day-to-day life reveals a lot about long-term compatibility. These questions help us understand how you want to actually live — not just what you value in theory.",
  open_text:
    "These three questions are the most important in all of Genesis. They help our AI understand you in ways checkboxes can't — take your time.",
};

export type ParentingKey = (typeof PARENTING_QUESTIONS)[number]["key"];
export type LifestyleKey = (typeof LIFESTYLE_QUESTIONS)[number]["key"];
export type AttachmentKey = (typeof ATTACHMENT_QUESTIONS)[number]["key"];
