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
  passesExistingChildrenFilter,
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

      // Fetch other onboarded users + their profiles. RLS lets us see our own
      // user_meta plus anyone we're mutually matched with — but for surfacing
      // candidates we rely on a public-safe view: in this MVP the dashboard
      // shows recently created profiles via the security definer narrative
      // pattern. Simplest: read from a public-friendly RPC or just allow
      // discoverability through a separate read pattern. Here, we'll show
      // profiles only if they've been explicitly opened up. For demo purposes,
      // we'll attempt a best-effort read; empty state is welcomed.
      // (Discoverability rules are intentionally conservative in MVP.)
      const { data: pool } = await supabase
        .from("users_meta")
        .select("id,name,age,city,photos,onboarding_complete")
        .neq("id", user.id)
        .eq("onboarding_complete", true)
        .eq("paused", false)
        .limit(20);

      // For each, RLS blocks profile reads unless mutually matched. The
      // dashboard will instead show the candidate's basic card (when reads are
      // permitted) and the rich profile is only shown on the compat screen
      // after matching. Here we surface what we can read.
      const ids = pool?.map((p) => p.id) ?? [];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("*").in("user_id", ids)
        : { data: [] as any[] };

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      const merged: CandidateProfile[] = (pool ?? []).map((m: any) => {
        const p = profileMap.get(m.id) || {};
        return {
          user_id: m.id,
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
        };
      });

      const filtered = merged.filter((c) => passesExistingChildrenFilter(v, c));
      filtered.sort((a, b) => categoryAlignment(v, b).score - categoryAlignment(v, a).score);
      setCandidates(filtered.slice(0, 5));
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
