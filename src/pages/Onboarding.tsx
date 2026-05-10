import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StepHeader from "@/components/onboarding/StepHeader";
import ChoiceGroup from "@/components/onboarding/ChoiceGroup";
import PhotoUploader from "@/components/onboarding/PhotoUploader";
import {
  ATTACHMENT_QUESTIONS,
  LIFESTYLE_QUESTIONS,
  PARENTING_QUESTIONS,
  RELATIONSHIP_OPTIONS,
  SECTION_INTROS,
  TIMELINE_OPTIONS,
} from "@/lib/onboarding-config";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";

const TOTAL_STEPS = 14;

type State = {
  // basics
  name: string;
  age: string;
  city: string;
  gender: "woman" | "man" | "";
  seeking: "men" | "women" | "everyone" | "";
  photos: string[];
  intent: "yes" | "later" | null;
  // family
  family_timeline: string;
  children_current: string;
  children_wanted: string;
  open_to_existing_children: "yes" | "no" | "open" | "";
  parenting_philosophy: Record<string, string>;
  lifestyle: Record<string, string>;
  relationship_structure: string;
  attachment_signals: Record<string, string>;
  open_text_sunday: string;
  open_text_parenting: string;
  open_text_future: string;
  bio: string;
};

const initial: State = {
  name: "",
  age: "",
  city: "",
  gender: "",
  seeking: "",
  photos: [],
  intent: null,
  family_timeline: "",
  children_current: "0",
  children_wanted: "",
  open_to_existing_children: "",
  parenting_philosophy: {},
  lifestyle: {},
  relationship_structure: "",
  attachment_signals: {},
  open_text_sunday: "",
  open_text_parenting: "",
  open_text_future: "",
  bio: "",
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [s, setS] = useState<State>(initial);
  const [busy, setBusy] = useState(false);

  // Hydrate from existing record (if user partially completed)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: meta }, { data: profile }] = await Promise.all([
        supabase.from("users_meta").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setS((prev) => ({
        ...prev,
        name: meta?.name || (user.user_metadata?.name as string) || "",
        age: meta?.age?.toString() || "",
        city: meta?.city || "",
        gender: (meta?.gender as any) || "",
        seeking: (meta?.seeking as any) || "",
        photos: meta?.photos || [],
        family_timeline: profile?.family_timeline || "",
        children_current: profile?.children_current?.toString() || "0",
        children_wanted: profile?.children_wanted?.toString() || "",
        open_to_existing_children: (profile?.open_to_existing_children as any) || "",
        parenting_philosophy: (profile?.parenting_philosophy as any) || {},
        lifestyle: (profile?.lifestyle as any) || {},
        relationship_structure: profile?.relationship_structure || "",
        attachment_signals: (profile?.attachment_signals as any) || {},
        open_text_sunday: profile?.open_text_sunday || "",
        open_text_parenting: profile?.open_text_parenting || "",
        open_text_future: profile?.open_text_future || "",
        bio: profile?.bio || "",
      }));
      if (meta?.onboarding_complete) navigate("/dashboard");
    })();
  }, [user, navigate]);

  const next = () => setStep((x) => Math.min(TOTAL_STEPS, x + 1));
  const back = () => setStep((x) => Math.max(1, x - 1));
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const ageNum = parseInt(s.age, 10);
      const { error: e1 } = await supabase
        .from("users_meta")
        .update({
          name: s.name,
          age: ageNum,
          city: s.city,
          photos: s.photos,
          onboarding_complete: true,
        })
        .eq("id", user.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("profiles")
        .update({
          family_timeline: s.family_timeline as any,
          children_current: parseInt(s.children_current || "0", 10),
          children_wanted: s.children_wanted ? parseInt(s.children_wanted, 10) : null,
          open_to_existing_children: s.open_to_existing_children || null,
          parenting_philosophy: s.parenting_philosophy,
          lifestyle: s.lifestyle,
          relationship_structure: s.relationship_structure as any,
          attachment_signals: s.attachment_signals,
          open_text_sunday: s.open_text_sunday,
          open_text_parenting: s.open_text_parenting,
          open_text_future: s.open_text_future,
          bio: s.bio,
        })
        .eq("user_id", user.id);
      if (e2) throw e2;

      toast.success("Welcome to Genesis. Your matches are being prepared.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const canContinue = useMemo(() => {
    switch (step) {
      case 1: return s.intent === "yes";
      case 2: {
        const a = parseInt(s.age, 10);
        return s.name.trim().length > 0 && a >= 25 && a <= 55 && s.city.trim().length > 0;
      }
      case 3: return s.photos.length >= 1;
      case 4: return !!s.family_timeline;
      case 5: return s.children_current !== "" && s.children_wanted !== "" && !!s.open_to_existing_children;
      case 6: return PARENTING_QUESTIONS.every((q) => s.parenting_philosophy[q.key]);
      case 7: return LIFESTYLE_QUESTIONS.every((q) => s.lifestyle[q.key]);
      case 8: return !!s.relationship_structure;
      case 9: return ATTACHMENT_QUESTIONS.every((q) => s.attachment_signals[q.key]);
      case 10: return s.open_text_sunday.trim().length > 0;
      case 11: return s.open_text_parenting.trim().length > 0;
      case 12: return s.open_text_future.trim().length > 0;
      case 13: return true; // bio optional
      case 14: return true;
      default: return true;
    }
  }, [step, s]);

  return (
    <div className="min-h-screen bg-gradient-sunrise pb-32 pt-10">
      <div className="container max-w-2xl">
        {step === 1 && (
          <Step>
            <StepHeader step={1} total={TOTAL_STEPS} title="Is Genesis right for you?" />
            <div className="letter-card p-8">
              <p className="font-serif text-xl leading-relaxed text-navy">
                Genesis is built for people who are actively looking for a partner to start or grow a family with.
              </p>
              <p className="mt-4 text-navy/70">Is this you?</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button
                  variant={s.intent === "yes" ? "warm" : "quiet"}
                  size="lg"
                  onClick={() => set("intent", "yes")}
                >
                  Yes, this is me
                </Button>
                <Button
                  variant="quiet"
                  size="lg"
                  onClick={() => {
                    set("intent", "later");
                    toast(
                      "Genesis isn't the right fit right now — and that's okay. Come back when you are. We'll be here.",
                      { duration: 6000 },
                    );
                    setTimeout(() => supabase.auth.signOut(), 1500);
                  }}
                >
                  Not right now
                </Button>
              </div>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step>
            <StepHeader step={2} total={TOTAL_STEPS} title="A few basics about you." />
            <div className="space-y-5 letter-card p-8">
              <div>
                <Label htmlFor="n">First name</Label>
                <Input id="n" className="quiet-input mt-2 h-12" value={s.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="a">Age</Label>
                  <Input
                    id="a"
                    type="number"
                    min={25}
                    max={55}
                    className="quiet-input mt-2 h-12"
                    value={s.age}
                    onChange={(e) => set("age", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-navy/50">Genesis is for ages 25–55.</p>
                </div>
                <div>
                  <Label htmlFor="c">City</Label>
                  <Input id="c" className="quiet-input mt-2 h-12" value={s.city} onChange={(e) => set("city", e.target.value)} />
                </div>
              </div>
            </div>
          </Step>
        )}

        {step === 3 && user && (
          <Step>
            <StepHeader step={3} total={TOTAL_STEPS} title="Add a few photos." intro="Up to six. Choose ones that feel like you on a good ordinary day." />
            <div className="letter-card p-8">
              <PhotoUploader userId={user.id} photos={s.photos} onChange={(p) => set("photos", p)} />
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step>
            <StepHeader step={4} total={TOTAL_STEPS} eyebrow="Family timeline" title="When are you hoping to start or expand your family?" />
            <ChoiceGroup options={TIMELINE_OPTIONS} value={s.family_timeline} onChange={(v) => set("family_timeline", v)} />
          </Step>
        )}

        {step === 5 && (
          <Step>
            <StepHeader step={5} total={TOTAL_STEPS} eyebrow="Children" title="Tell us about children." />
            <div className="space-y-6 letter-card p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cc">Children you have now</Label>
                  <Input id="cc" type="number" min={0} max={10} className="quiet-input mt-2 h-12" value={s.children_current} onChange={(e) => set("children_current", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cw">Total children you'd like</Label>
                  <Input id="cw" type="number" min={0} max={10} className="quiet-input mt-2 h-12" value={s.children_wanted} onChange={(e) => set("children_wanted", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Are you open to a partner who already has children?</Label>
                <ChoiceGroup
                  cols={2}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "open", label: "Open to it" },
                    { value: "no", label: "No" },
                  ]}
                  value={s.open_to_existing_children}
                  onChange={(v) => set("open_to_existing_children", v as any)}
                />
              </div>
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step>
            <StepHeader step={6} total={TOTAL_STEPS} eyebrow="Parenting philosophy" title="How do you think about parenting?" intro={SECTION_INTROS.parenting} />
            <div className="space-y-8">
              {PARENTING_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <Label className="mb-3 block font-serif text-lg text-navy">{q.label}</Label>
                  <ChoiceGroup
                    cols={2}
                    options={q.options}
                    value={s.parenting_philosophy[q.key]}
                    onChange={(v) => set("parenting_philosophy", { ...s.parenting_philosophy, [q.key]: v })}
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 7 && (
          <Step>
            <StepHeader step={7} total={TOTAL_STEPS} eyebrow="Lifestyle" title="How do you want to actually live?" intro={SECTION_INTROS.lifestyle} />
            <div className="space-y-8">
              {LIFESTYLE_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <Label className="mb-3 block font-serif text-lg text-navy">{q.label}</Label>
                  <ChoiceGroup
                    cols={2}
                    options={q.options}
                    value={s.lifestyle[q.key]}
                    onChange={(v) => set("lifestyle", { ...s.lifestyle, [q.key]: v })}
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 8 && (
          <Step>
            <StepHeader step={8} total={TOTAL_STEPS} eyebrow="Relationship structure" title="What does the structure of your relationship look like?" />
            <ChoiceGroup options={RELATIONSHIP_OPTIONS} value={s.relationship_structure} onChange={(v) => set("relationship_structure", v)} />
          </Step>
        )}

        {step === 9 && (
          <Step>
            <StepHeader step={9} total={TOTAL_STEPS} eyebrow="A few about you, in relationships" title="A few more questions about how you connect." />
            <div className="space-y-8">
              {ATTACHMENT_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <Label className="mb-3 block font-serif text-lg text-navy">{q.label}</Label>
                  <ChoiceGroup
                    options={q.options}
                    value={s.attachment_signals[q.key]}
                    onChange={(v) => set("attachment_signals", { ...s.attachment_signals, [q.key]: v })}
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 10 && (
          <Step>
            <StepHeader step={10} total={TOTAL_STEPS} eyebrow="In your own words" title="Describe your ideal Sunday morning as a family — what does that look like?" intro={SECTION_INTROS.open_text} />
            <OpenText value={s.open_text_sunday} onChange={(v) => set("open_text_sunday", v)} />
          </Step>
        )}

        {step === 11 && (
          <Step>
            <StepHeader step={11} total={TOTAL_STEPS} eyebrow="In your own words" title="What does being a great parent mean to you in practice?" />
            <OpenText value={s.open_text_parenting} onChange={(v) => set("open_text_parenting", v)} />
          </Step>
        )}

        {step === 12 && (
          <Step>
            <StepHeader
              step={12}
              total={TOTAL_STEPS}
              eyebrow="Last open question"
              title="What are you most looking forward to — and maybe a little nervous about — in building a family?"
            />
            <OpenText value={s.open_text_future} onChange={(v) => set("open_text_future", v)} />
            <p className="mt-3 text-sm italic text-navy/60">
              There are no wrong answers here — honesty is what makes Genesis work.
            </p>
          </Step>
        )}

        {step === 13 && (
          <Step>
            <StepHeader step={13} total={TOTAL_STEPS} eyebrow="A short bio (optional)" title="Anything else you'd want a thoughtful match to know?" />
            <Textarea
              maxLength={400}
              rows={5}
              className="quiet-input"
              placeholder="A line or two — the things that don't fit into a checkbox."
              value={s.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
            <p className="mt-2 text-right text-xs text-navy/50">{s.bio.length}/400</p>
          </Step>
        )}

        {step === 14 && (
          <Step>
            <StepHeader step={14} total={TOTAL_STEPS} eyebrow="One last look" title="You're ready." intro="We'll review what you've shared and start preparing thoughtful matches." />
            <div className="letter-card p-8">
              <ul className="space-y-3 text-navy/80">
                <li><strong className="font-serif">Name:</strong> {s.name}, {s.age}</li>
                <li><strong className="font-serif">City:</strong> {s.city}</li>
                <li><strong className="font-serif">Family timeline:</strong> {TIMELINE_OPTIONS.find(o => o.value === s.family_timeline)?.label}</li>
                <li><strong className="font-serif">Children:</strong> {s.children_current} now, {s.children_wanted} wanted</li>
                <li><strong className="font-serif">Photos:</strong> {s.photos.length}</li>
              </ul>
              <Button onClick={finish} disabled={busy} variant="warm" size="xl" className="mt-8 w-full">
                {busy ? "Saving…" : "Enter Genesis"}
              </Button>
            </div>
          </Step>
        )}

        {/* Footer nav */}
        {step > 1 && step < TOTAL_STEPS && (
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/40 bg-background/95 backdrop-blur">
            <div className="container flex max-w-2xl items-center justify-between py-4">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button variant="warm" onClick={next} disabled={!canContinue}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
        {step === 1 && s.intent === "yes" && (
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/40 bg-background/95 backdrop-blur">
            <div className="container flex max-w-2xl items-center justify-end py-4">
              <Button variant="warm" onClick={next}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return <section className="animate-fade-up">{children}</section>;
}

function OpenText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Textarea
        maxLength={300}
        rows={5}
        className="quiet-input text-base leading-relaxed"
        placeholder="Take your time…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="mt-2 text-right text-xs text-navy/50">{value.length}/300</p>
    </div>
  );
}
