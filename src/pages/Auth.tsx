import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.get("mode") === "signup") setMode("signup");
  }, [params]);

  if (!loading && user) return <Navigate to="/onboarding" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) throw error;
        toast.success("Welcome to Genesis. Let's set up your profile.");
        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sunrise">
      <div className="container max-w-md py-16">
        <Link to="/" className="font-serif text-3xl text-navy">
          Genesis
        </Link>

        <div className="letter-card mt-10 p-8 animate-fade-up">
          <h1 className="font-serif text-3xl text-navy">
            {mode === "signup" ? "Begin Genesis" : "Welcome back"}
          </h1>
          <p className="mt-2 text-navy/60">
            {mode === "signup"
              ? "Tell us how to reach you. We'll guide you from here."
              : "Sign in to see today's matches."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Your first name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="quiet-input mt-2 h-12"
                  placeholder="Avery"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="quiet-input mt-2 h-12"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="quiet-input mt-2 h-12"
                placeholder="At least 8 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            <Button type="submit" variant="warm" size="lg" className="w-full" disabled={busy}>
              {busy ? "One moment…" : mode === "signup" ? "Continue" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-6 w-full text-center text-sm text-navy/60 underline-offset-4 hover:underline"
          >
            {mode === "signup" ? "Already have an account? Sign in" : "New to Genesis? Begin here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
