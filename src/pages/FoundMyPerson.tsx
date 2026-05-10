import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Heart } from "lucide-react";

export default function FoundMyPerson() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [partner, setPartner] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("success")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDone(true);
      });
  }, [user]);

  const celebrate = async (paid: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const { error: insertErr } = await supabase.from("success").upsert(
        {
          user_id: user.id,
          partner_found: partner || null,
          stripe_paid: paid,
        },
        { onConflict: "user_id" }
      );
      if (insertErr) throw insertErr;

      const { error: pauseErr } = await supabase
        .from("users_meta")
        .update({ paused: true })
        .eq("id", user.id);
      if (pauseErr) throw pauseErr;

      setDone(true);
    } catch (e: any) {
      toast.error(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AppShell>
        <div className="container max-w-xl pt-16 text-center animate-fade-up">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-gradient-gold shadow-warm">
            <Heart className="size-10 text-navy" />
          </div>
          <h1 className="font-serif text-4xl text-navy md:text-5xl">
            That's the whole point.
          </h1>
          <p className="mx-auto mt-6 max-w-md leading-relaxed text-navy/70">
            We hope you'll think of Genesis fondly — and tell other thoughtful people about it. Your profile
            is paused. Go live your life.
          </p>
          <Button asChild variant="quiet" size="lg" className="mt-10">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-xl pt-10">
        <div className="letter-card p-8 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.25em] text-terracotta">Before you go</p>
          <h1 className="mt-3 font-serif text-3xl text-navy md:text-4xl">
            Genesis is free to use.
          </h1>
          <p className="mt-5 leading-relaxed text-navy/75">
            We only charge a one-time <span className="font-serif italic">$99 celebration fee</span> when
            you've actually found your person. This is how we keep the platform running without
            subscriptions that profit from loneliness.
          </p>
          <p className="mt-3 leading-relaxed text-navy/75">Pay only if you want to.</p>

          <div className="mt-6">
            <label className="text-sm text-navy/70">Who did you meet? (optional, private)</label>
            <Input
              className="quiet-input mt-2 h-12"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="Their first name"
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="gold" size="lg" className="flex-1" onClick={() => celebrate(true)} disabled={busy}>
              Pay $99
            </Button>
            <Button variant="quiet" size="lg" className="flex-1" onClick={() => celebrate(false)} disabled={busy}>
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
