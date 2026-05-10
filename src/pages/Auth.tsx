import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "forgot" | "reset";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Detect Supabase password-reset redirect (hash contains type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
      // Supabase sets the session from the hash automatically
    }
  }, []);

  useEffect(() => {
    if (params.get("mode") === "signup") setMode("signup");
  }, [params]);

  if (!loading && user && mode !== "reset") return <Navigate to="/onboarding" replace />;

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

      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Reset link sent — check your inbox.");
        setMode("signin");

      } else if (mode === "reset") {
        if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast.success("Password updated. You're signed in.");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: "Welcome back",
    signup: "Begin Genesis",
    forgot: "Reset your password",
    reset:  "Set a new password",
  };

  const subtitles: Record<Mode, string> = {
    signin: "Sign in to see today's matches.",
    signup: "Tell us how to reach you. We'll guide you from here.",
    forgot: "Enter your email and we'll send a reset link.",
    reset:  "Choose a new password to continue.",
  };

  return (
    <div className="min-h-screen bg-gradient-sunrise">
      <div className="container max-w-md pt-10 pb-16 md:py-16">
        <Link to="/" className="font-serif text-3xl text-navy">
          Genesis
        </Link>

        <div className="letter-card mt-8 p-6 md:p-8 animate-fade-up">
          <h1 className="font-serif text-3xl text-navy">{titles[mode]}</h1>
          <p className="mt-2 text-navy/60">{subtitles[mode]}</p>

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

            {(mode === "signin" || mode === "signup" || mode === "forgot") && (
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
            )}

            {(mode === "signin" || mode === "signup") && (
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
            )}

            {mode === "reset" && (
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="quiet-input mt-2 h-12"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
            )}

            <Button type="submit" variant="warm" size="lg" className="w-full" disabled={busy}>
              {busy ? "One moment…" : {
                signin: "Sign in",
                signup: "Continue",
                forgot: "Send reset link",
                reset:  "Set password",
              }[mode]}
            </Button>
          </form>

          {/* Footer links */}
          <div className="mt-6 space-y-2 text-center text-sm text-navy/60">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="block w-full underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="block w-full underline-offset-4 hover:underline"
                >
                  New to Genesis? Begin here
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="block w-full underline-offset-4 hover:underline"
              >
                Already have an account? Sign in
              </button>
            )}
            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="block w-full underline-offset-4 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
