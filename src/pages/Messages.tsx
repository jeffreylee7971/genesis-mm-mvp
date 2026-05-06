import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { toast } from "sonner";

type Conversation = {
  match_id: string;
  other_id: string;
  other_name: string;
  other_photo: string | null;
  last_message: string | null;
  last_at: string | null;
};

type Message = { id: string; sender_id: string; content: string; created_at: string };

const STARTERS_PLACEHOLDER = [
  "Your Sunday morning answer made me curious — do you already have a neighborhood in mind?",
  "What you wrote about being a great parent really landed. What's one thing your own parents got right?",
  "I noticed we both want a similar timeline. What does the year ahead look like for you?",
];

export default function Messages() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .in("status", ["mutual", "connected"])
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      const otherIds = (matches ?? []).map((m: any) => (m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1));
      const { data: metas } =
        otherIds.length
          ? await supabase.from("users_meta").select("id,name,photos").in("id", otherIds)
          : { data: [] as any[] };
      const metaMap = new Map((metas ?? []).map((m: any) => [m.id, m]));
      const list: Conversation[] = (matches ?? []).map((m: any) => {
        const otherId = m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1;
        const meta = metaMap.get(otherId);
        return {
          match_id: m.id,
          other_id: otherId,
          other_name: meta?.name ?? "Match",
          other_photo: meta?.photos?.[0] ?? null,
          last_message: null,
          last_at: m.updated_at,
        };
      });
      setConvos(list);
      if (list.length && !activeId) setActiveId(list[0].match_id);
      setLoading(false);
    })();
  }, [user]);

  // Load messages for active conversation + realtime
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", activeId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((data ?? []) as Message[]);
    })();

    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const active = useMemo(() => convos.find((c) => c.match_id === activeId) ?? null, [convos, activeId]);

  const send = async () => {
    if (!user || !activeId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      match_id: activeId,
      sender_id: user.id,
      content,
    });
    if (error) toast.error(error.message);
  };

  return (
    <AppShell>
      <div className="container pt-6">
        <h1 className="mb-6 font-serif text-3xl text-navy md:text-4xl">Messages</h1>

        {loading && <p className="text-navy/50">Loading…</p>}

        {!loading && convos.length === 0 && (
          <div className="letter-card p-10 text-center">
            <h2 className="font-serif text-2xl text-navy">No conversations yet.</h2>
            <p className="mt-3 text-navy/70">When mutual interest happens, it will live here.</p>
            <Button asChild variant="warm" className="mt-6">
              <Link to="/dashboard">See today's matches</Link>
            </Button>
          </div>
        )}

        {convos.length > 0 && (
          <div className="grid gap-6 md:grid-cols-[280px_1fr] md:max-h-[calc(100vh-180px)]">
            {/* Conversation list */}
            <aside className="space-y-2">
              {convos.map((c) => (
                <button
                  key={c.match_id}
                  onClick={() => setActiveId(c.match_id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    activeId === c.match_id ? "border-terracotta bg-terracotta/5" : "border-border bg-card hover:border-terracotta/40"
                  }`}
                >
                  <div className="size-12 overflow-hidden rounded-full bg-cream-deep">
                    {c.other_photo ? (
                      <img src={c.other_photo} alt={c.other_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-lg text-navy/40">
                        {c.other_name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-serif text-base text-navy">{c.other_name}</p>
                    <p className="truncate text-xs text-navy/50">A new conversation</p>
                  </div>
                </button>
              ))}
            </aside>

            {/* Active conversation */}
            <section className="letter-card flex h-[70vh] flex-col overflow-hidden">
              {active && (
                <>
                  <header className="border-b border-border/60 px-5 py-4">
                    <h2 className="font-serif text-xl text-navy">{active.other_name}</h2>
                  </header>

                  <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
                    {messages.length === 0 && (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-wider text-navy/50">A few ways to begin</p>
                        {STARTERS_PLACEHOLDER.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setDraft(s)}
                            className="block w-full rounded-lg border border-border/60 bg-cream-deep/40 px-4 py-3 text-left text-sm leading-relaxed text-navy transition hover:border-terracotta/40 hover:bg-cream-deep/70"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {messages.map((m) => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                              mine ? "bg-terracotta text-cream" : "bg-cream-deep text-navy"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send();
                    }}
                    className="flex gap-2 border-t border-border/60 p-3"
                  >
                    <Input
                      className="quiet-input h-12"
                      placeholder="Write a message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <Button type="submit" variant="warm" size="icon" className="h-12 w-12" disabled={!draft.trim()}>
                      <Send className="size-4" />
                    </Button>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
