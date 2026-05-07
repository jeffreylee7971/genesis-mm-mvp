import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  CandidateProfile,
  ViewerProfile,
  categoryAlignment,
  fetchViewerFull,
  highlightFor,
  timelineLabel,
} from "@/lib/matching";
import { Sparkles } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const v = await fetchViewerFull(user.id);
      if (!v) {
        setLoading(false);
        return;
      }
      setViewer(v);

      // Generate today's curated matches (no-op if already generated today).
      await supabase.rpc("generate_daily_matches", { _viewer: user.id });

      // Read today's daily matches for this viewer.
      const today = new Date().toISOString().slice(0, 10);
      const { data: dms } = await supabase
        .from("daily_matches")
        .select("candidate_id, compatibility_score, highlight")
        .eq("viewer_id", user.id)
        .eq("match_date", today)
        .order("compatibility_score", { ascending: false });

      const ids = (dms ?? []).map((d) => d.candidate_id);
      if (!ids.length) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      const [{ data: metas }, { data: profiles }] = await Promise.all([
        supabase.from("users_meta").select("id,name,age,city,photos").in("id", ids),
        supabase.from("profiles").select("*").in("user_id", ids),
      ]);

      const metaMap = new Map((metas ?? []).map((m: any) => [m.id, m]));
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

      const merged: CandidateProfile[] = (dms ?? [])
        .map((d) => {
          const m: any = metaMap.get(d.candidate_id);
          const p: any = profileMap.get(d.candidate_id) ?? {};
          if (!m) return null;
          return {
            user_id: d.candidate_id,
            name: m.name,
            age: m.age,
            city: m.city,
            photos: m.photos ?? [],
            family_timeline: p.family_timeline ?? null,
            children_current: p.children_current ?? null,
            children_wanted: p.children_wanted ?? null,
            open_to_existing_children: p.open_to_existing_children ?? null,
            parenting_philosophy: p.parenting_philosophy ?? {},
            lifestyle: p.lifestyle ?? {},
            relationship_structure: p.relationship_structure ?? null,
            attachment_signals: p.attachment_signals ?? {},
            open_text_sunday: p.open_text_sunday ?? null,
            open_text_parenting: p.open_text_parenting ?? null,
            open_text_future: p.open_text_future ?? null,
            bio: p.bio ?? null,
          } as CandidateProfile;
        })
        .filter(Boolean) as CandidateProfile[];

      setCandidates(merged);
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="container max-w-3xl pt-10">
        <header className="mb-10 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.25em] text-terracotta">Today</p>
          <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">
            {viewer ? `Good to see you, ${viewer.name.split(" ")[0]}.` : "Welcome."}
          </h1>
          <p className="mt-3 text-navy/70">
            A handful of people we think you'd want to know. Read slowly.
          </p>
        </header>

        {loading && <p className="text-navy/50">Preparing your matches…</p>}

        {!loading && candidates.length === 0 && (
          <div className="letter-card p-10 text-center animate-fade-up">
            <Sparkles className="mx-auto mb-4 size-8 text-gold" />
            <h2 className="font-serif text-2xl text-navy">Genesis is still small.</h2>
            <p className="mx-auto mt-3 max-w-md text-navy/70">
              We're carefully growing the early community. Your matches will appear here as more thoughtful people
              join. We'll let you know — never with a notification badge.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {candidates.map((c) => {
            const align = categoryAlignment(viewer!, c);
            return (
              <article
                key={c.user_id}
                className="letter-card overflow-hidden transition-shadow hover:shadow-warm animate-fade-up"
              >
                <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
                  <div className="aspect-square sm:aspect-auto bg-cream-deep">
                    {c.photos[0] ? (
                      <img src={c.photos[0]} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-3xl text-navy/30">
                        {c.name?.[0]?.toUpperCase() ?? "•"}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-serif text-2xl text-navy">
                        {c.name || "—"}
                        {c.age ? <span className="text-navy/60">, {c.age}</span> : null}
                      </h2>
                      <span className="text-xs uppercase tracking-wider text-navy/50">{c.city}</span>
                    </div>
                    <p className="mt-1 text-sm text-navy/60">
                      Hoping to start {timelineLabel(c.family_timeline).toLowerCase()}
                    </p>
                    <div className="mt-4 rounded-lg bg-cream-deep/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-terracotta">A point of alignment</p>
                      <p className="mt-1 text-navy">{highlightFor(viewer!, c)}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-serif text-lg italic text-gold">{align.score}% aligned</span>
                      <Button asChild variant="warm">
                        <Link to={`/match/${c.user_id}`}>Learn more</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
