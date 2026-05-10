import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  CandidateProfile,
  categoryAlignment,
  fetchViewerFull,
  placeholderNarrative,
  timelineLabel,
  ViewerProfile,
} from "@/lib/matching";
import { generateNarrative } from "@/lib/narrative";
import { getMatchCtaState, getMatchDetailViewState, MatchRow } from "@/lib/match-detail";
import { toast } from "sonner";
import { ArrowLeft, Heart } from "lucide-react";

export default function MatchDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);
  const [c, setC] = useState<CandidateProfile | null>(null);
  const [matchRow, setMatchRow] = useState<MatchRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId || !id) return;
    let cancelled = false;
    (async () => {
      setLoaded(false);
      setMatchRow(null);
      setC(null);
      try {
        const [v, candidateResult, matchResult] = await Promise.all([
          fetchViewerFull(userId),
          Promise.all([
            supabase.from("users_meta").select("*").eq("id", id).maybeSingle(),
            supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
          ]),
          (() => {
            const [a, b] = [userId, id].sort();
            return supabase
              .from("matches")
              .select("id, status, initiator, compatibility_narrative")
              .eq("user_id_1", a)
              .eq("user_id_2", b)
              .maybeSingle();
          })(),
        ]);

        if (cancelled) return;

        const [[{ data: meta }, { data: profile }], { data: m }] = [candidateResult, matchResult];

        // Use stored narrative from DB if available, then generate via Claude
        const storedNarrative = m?.compatibility_narrative ?? null;
        if (storedNarrative) {
          setNarrative(storedNarrative);
        }

        setViewer(v);
        setC(
          meta
            ? {
                user_id: id,
                name: meta.name,
                age: meta.age,
                city: meta.city,
                photos: meta.photos ?? [],
                family_timeline: profile?.family_timeline ?? null,
                children_current: profile?.children_current ?? null,
                children_wanted: profile?.children_wanted ?? null,
                open_to_existing_children: profile?.open_to_existing_children ?? null,
                parenting_philosophy: (profile?.parenting_philosophy as any) ?? {},
                lifestyle: (profile?.lifestyle as any) ?? {},
                relationship_structure: profile?.relationship_structure ?? null,
                attachment_signals: (profile?.attachment_signals as any) ?? {},
                open_text_sunday: profile?.open_text_sunday ?? null,
                open_text_parenting: profile?.open_text_parenting ?? null,
                open_text_future: profile?.open_text_future ?? null,
                bio: profile?.bio ?? null,
              }
            : null,
        );
        setMatchRow(m ? { id: m.id, status: m.status, initiator: m.initiator } : null);

        // Generate narrative via Claude if not already stored
        if (!storedNarrative && v && meta) {
          const candidate: CandidateProfile = {
            user_id: id!,
            name: meta.name,
            age: meta.age,
            city: meta.city,
            photos: meta.photos ?? [],
            family_timeline: profile?.family_timeline ?? null,
            children_current: profile?.children_current ?? null,
            children_wanted: profile?.children_wanted ?? null,
            open_to_existing_children: profile?.open_to_existing_children ?? null,
            parenting_philosophy: (profile?.parenting_philosophy as any) ?? {},
            lifestyle: (profile?.lifestyle as any) ?? {},
            relationship_structure: profile?.relationship_structure ?? null,
            attachment_signals: (profile?.attachment_signals as any) ?? {},
            open_text_sunday: profile?.open_text_sunday ?? null,
            open_text_parenting: profile?.open_text_parenting ?? null,
            open_text_future: profile?.open_text_future ?? null,
            bio: profile?.bio ?? null,
          };
          generateNarrative(v, candidate).then((text) => {
            if (!cancelled) setNarrative(text);
          });
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e.message ?? "Could not load this match.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, id]);

  const expressInterest = async () => {
    if (!user || !id) return;
    setBusy(true);
    try {
      const [a, b] = [user.id, id].sort();
      const { data: existing } = await supabase
        .from("matches")
        .select("*")
        .eq("user_id_1", a)
        .eq("user_id_2", b)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from("matches")
          .insert({
            user_id_1: a,
            user_id_2: b,
            status: "pending" as any,
            initiator: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        if (!inserted) throw new Error("Insert returned no row");
        setMatchRow({ id: inserted.id, status: "pending", initiator: user.id });
        toast.success("Interest expressed. We'll let you know if it's mutual.");
      } else if (existing.initiator && existing.initiator !== user.id && existing.status === "pending") {
        const score = viewer && c ? categoryAlignment(viewer, c).score : null;
        const savedNarrative = narrative ?? (viewer && c ? placeholderNarrative(viewer, c) : null);
        const { data: updated, error } = await supabase
          .from("matches")
          .update({ status: "mutual" as any, compatibility_score: score, compatibility_narrative: savedNarrative })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        if (!updated) throw new Error("Update returned no row");
        setMatchRow({ id: updated.id, status: "mutual", initiator: existing.initiator });
        toast.success("It's mutual. You can now message each other.");
      } else {
        toast("You've already expressed interest.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const viewState = getMatchDetailViewState({ loaded, viewer, candidate: c });
  const ctaState = getMatchCtaState(matchRow, user?.id);

  if (viewState === "loading")
    return (
      <AppShell>
        <div className="container max-w-3xl pt-10 text-navy/50">Loading…</div>
      </AppShell>
    );

  if (viewState === "viewer-unavailable")
    return (
      <AppShell>
        <div className="container max-w-3xl pt-10">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <p className="text-navy/60">We couldn't load your profile right now.</p>
        </div>
      </AppShell>
    );

  if (viewState === "candidate-unavailable")
    return (
      <AppShell>
        <div className="container max-w-3xl pt-10">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <p className="text-navy/60">This profile isn't available to you right now.</p>
        </div>
      </AppShell>
    );

  const align = categoryAlignment(viewer, c);

  return (
    <AppShell>
      <div className="container max-w-3xl pt-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="size-4" /> Back
        </Button>

        {/* Photo gallery */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {c.photos.length === 0 && (
            <div className="col-span-full flex aspect-[3/2] items-center justify-center rounded-2xl bg-cream-deep font-serif text-4xl text-navy/30">
              {c.name?.[0]?.toUpperCase() ?? "•"}
            </div>
          )}
          {c.photos.map((url, i) => (
            <div
              key={url}
              className={`overflow-hidden rounded-2xl bg-cream-deep ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}
            >
              <img src={url} alt={`${c.name} photo ${i + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        <header className="mb-8 animate-fade-up">
          <h1 className="font-serif text-4xl text-navy">
            {c.name}
            {c.age ? <span className="text-navy/60">, {c.age}</span> : null}
          </h1>
          <p className="mt-1 text-navy/60">{c.city}</p>
        </header>

        {/* Compatibility narrative */}
        <div className="letter-card mb-8 p-7 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-terracotta">Why we think you'd connect</p>
          {narrative ? (
            <p className="mt-3 font-serif text-xl leading-relaxed text-navy">{narrative}</p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="h-5 w-full animate-pulse rounded bg-cream-deep" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-cream-deep" />
              <div className="h-5 w-3/5 animate-pulse rounded bg-cream-deep" />
            </div>
          )}
        </div>

        {/* Category alignment */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <AlignCard label="Family timeline" value={timelineLabel(c.family_timeline)} strength={align.timeline} />
          <AlignCard label="Parenting philosophy" value={`${Math.round(align.parenting * 100)}% overlap`} strength={align.parenting} />
          <AlignCard label="Lifestyle" value={`${Math.round(align.lifestyle * 100)}% overlap`} strength={align.lifestyle} />
          <AlignCard label="Values & structure" value={`${Math.round(align.values * 100)}% overlap`} strength={align.values} />
        </div>

        {/* Open text excerpts */}
        {(c.open_text_sunday || c.open_text_parenting || c.open_text_future) && (
          <div className="letter-card mb-8 space-y-6 p-7">
            {c.open_text_sunday && (
              <Quote label="An ideal Sunday morning">{c.open_text_sunday}</Quote>
            )}
            {c.open_text_parenting && (
              <Quote label="On being a great parent">{c.open_text_parenting}</Quote>
            )}
            {c.open_text_future && (
              <Quote label="Looking forward to / nervous about">{c.open_text_future}</Quote>
            )}
          </div>
        )}

        {c.bio && (
          <div className="letter-card mb-8 p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-terracotta">A note from {c.name.split(" ")[0]}</p>
            <p className="mt-3 leading-relaxed text-navy/80">{c.bio}</p>
          </div>
        )}

        {/* CTA */}
        <div className="sticky bottom-20 z-20 sm:bottom-6">
          {ctaState === "message" ? (
            <Button asChild variant="warm" size="xl" className="w-full">
              <Link to="/messages">Message {c.name.split(" ")[0]}</Link>
            </Button>
          ) : ctaState === "interest-expressed" ? (
            <Button disabled variant="quiet" size="xl" className="w-full">
              Interest expressed
            </Button>
          ) : (
            <Button onClick={expressInterest} disabled={busy} variant="warm" size="xl" className="w-full">
              <Heart className="size-5" /> {busy ? "One moment…" : "Express interest"}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AlignCard({ label, value, strength }: { label: string; value: string; strength: number }) {
  // visual indicator: 1 to 4 small marks
  const marks = Math.max(1, Math.round(strength * 4));
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-navy/50">{label}</p>
      <p className="mt-2 font-serif text-lg text-navy">{value}</p>
      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 w-8 rounded-full transition-colors ${i < marks ? "bg-terracotta" : "bg-cream-deep"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Quote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-terracotta">{label}</p>
      <p className="mt-2 border-l-2 border-gold pl-4 font-serif text-lg italic leading-relaxed text-navy">
        “{children}”
      </p>
    </div>
  );
}
