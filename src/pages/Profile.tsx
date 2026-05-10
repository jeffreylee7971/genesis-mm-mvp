import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PhotoUploader from "@/components/onboarding/PhotoUploader";
import { toast } from "sonner";
import { Heart, LogOut, PauseCircle } from "lucide-react";
import { triggerXScoring } from "@/lib/scoring";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [paused, setPaused] = useState(false);
  const [xConnected, setXConnected] = useState(false);
  const [xHandle, setXHandle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: meta }, { data: profile }] = await Promise.all([
        supabase.from("users_meta").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setName(meta?.name ?? "");
      setAge(meta?.age?.toString() ?? "");
      setCity(meta?.city ?? "");
      setPhotos(meta?.photos ?? []);
      setPaused(meta?.paused ?? false);
      setXConnected(meta?.x_connected ?? false);
      setXHandle(meta?.x_handle ?? "");
      setBio(profile?.bio ?? "");
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase
        .from("users_meta")
        .update({
          name,
          age: age ? parseInt(age, 10) : null,
          city,
          photos,
          paused,
          x_connected: xConnected,
          x_handle: xConnected ? xHandle : null,
        })
        .eq("id", user.id);
      await supabase.from("profiles").update({ bio }).eq("user_id", user.id);
      toast.success("Saved.");
      // Fire X enrichment if handle is connected — fire-and-forget
      if (xConnected && xHandle.trim()) triggerXScoring(user.id, xHandle);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user)
    return (
      <AppShell>
        <div className="container max-w-2xl pt-10 text-navy/50">Loading…</div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="container max-w-2xl space-y-8 pt-6">
        <header>
          <h1 className="font-serif text-3xl text-navy md:text-4xl">Your profile</h1>
          <p className="mt-1 text-navy/60">Update what others see and how Genesis works for you.</p>
        </header>

        {/* Photos */}
        <section className="letter-card p-7">
          <h2 className="mb-5 font-serif text-xl text-navy">Photos</h2>
          <PhotoUploader userId={user.id} photos={photos} onChange={setPhotos} />
        </section>

        {/* Basics */}
        <section className="letter-card space-y-5 p-7">
          <h2 className="font-serif text-xl text-navy">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>First name</Label>
              <Input className="quiet-input mt-2 h-12" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                type="number"
                min={25}
                max={55}
                className="quiet-input mt-2 h-12"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>City</Label>
              <Input className="quiet-input mt-2 h-12" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Short bio</Label>
            <Textarea
              className="quiet-input mt-2"
              maxLength={400}
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </section>

        {/* X connect (placeholder) */}
        <section className="letter-card space-y-5 p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl text-navy">Connect your X account</h2>
              <p className="mt-2 max-w-md text-sm text-navy/60">
                Linking X lets Genesis understand your values better and is never shared with other users.
              </p>
            </div>
            <Switch checked={xConnected} onCheckedChange={setXConnected} />
          </div>
          {xConnected && (
            <div>
              <Label>X handle</Label>
              <Input
                placeholder="@yourhandle"
                className="quiet-input mt-2 h-12"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
              />
            </div>
          )}
        </section>

        {/* Account */}
        <section className="letter-card space-y-5 p-7">
          <h2 className="font-serif text-xl text-navy">Account</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-navy">Pause my account</p>
              <p className="mt-1 text-sm text-navy/60">Hide me from matches without losing my profile.</p>
            </div>
            <Switch checked={paused} onCheckedChange={setPaused} />
          </div>

          <Button variant="warm" size="lg" className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>

          <Button
            variant="gold"
            size="lg"
            className="w-full"
            onClick={() => navigate("/found-my-person")}
          >
            <Heart className="size-5" /> I Found My Person
          </Button>

          <Button variant="ghost" className="w-full text-navy/60" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
