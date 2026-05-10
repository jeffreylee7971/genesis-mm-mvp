import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

interface AdminStats {
  users: {
    total: number;
    active: number;
    paused: number;
    onboarding: number;
    by_gender: Record<string, number>;
    top_cities: { city: string; count: number }[];
  };
  matches: {
    total: number;
    pending: number;
    mutual: number;
    connected: number;
    passed: number;
  };
  messages: number;
  success: {
    total: number;
    paid: number;
    skipped: number;
    revenue: number;
  };
  recent_users: {
    name: string;
    city: string;
    gender: string;
    onboarding_complete: boolean;
    paused: boolean;
    created_at: string;
  }[];
}

export default function Admin() {
  const { session } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/admin-stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((e) => setError(e.message));
  }, [session]);

  if (error) {
    return (
      <AppShell>
        <div className="container pt-16 text-center text-terracotta">{error}</div>
      </AppShell>
    );
  }

  if (!stats) {
    return (
      <AppShell>
        <div className="container pt-16 text-center text-navy/40">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-5xl py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-terracotta mb-2">Admin</p>
        <h1 className="font-serif text-3xl text-navy mb-8">Dashboard</h1>

        {/* Primary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <StatCard label="Total users" value={stats.users.total} />
          <StatCard label="Active" value={stats.users.active} />
          <StatCard label="Successes" value={stats.success.total} />
          <StatCard label="Revenue" value={`$${stats.success.revenue}`} gold />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          <StatCard label="Matches" value={stats.matches.total} />
          <StatCard label="Mutual" value={stats.matches.mutual} />
          <StatCard label="Messages" value={stats.messages} />
          <StatCard label="Stripe paid" value={stats.success.paid} />
        </div>

        {/* Gender + Cities */}
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div className="letter-card p-6">
            <h2 className="font-serif text-base text-navy mb-3">Users</h2>
            <Row label="Active" value={stats.users.active} />
            <Row label="In onboarding" value={stats.users.onboarding} />
            <Row label="Paused" value={stats.users.paused} />
            <div className="border-t border-navy/10 mt-3 pt-3">
              {Object.entries(stats.users.by_gender).map(([g, n]) => (
                <Row key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} value={n} />
              ))}
            </div>
          </div>

          <div className="letter-card p-6">
            <h2 className="font-serif text-base text-navy mb-3">Top cities</h2>
            {stats.users.top_cities.length > 0 ? (
              stats.users.top_cities.map(({ city, count }) => (
                <Row key={city} label={city} value={count} />
              ))
            ) : (
              <p className="text-sm text-navy/40">No city data yet</p>
            )}
          </div>
        </div>

        {/* Match pipeline */}
        <div className="letter-card p-6 mb-5">
          <h2 className="font-serif text-base text-navy mb-4">Match pipeline</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: "Pending", value: stats.matches.pending },
              { label: "Mutual", value: stats.matches.mutual },
              { label: "Connected", value: stats.matches.connected },
              { label: "Passed", value: stats.matches.passed },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="font-serif text-2xl text-navy">{value}</div>
                <div className="text-xs text-navy/50 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="letter-card p-6">
          <h2 className="font-serif text-base text-navy mb-4">Recent signups</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/10">
                  {["Name", "City", "Gender", "Status", "Joined"].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 text-navy/40 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_users.map((u, i) => (
                  <tr key={i} className="border-b border-navy/5 last:border-0">
                    <td className="py-2 pr-4 text-navy">{u.name || "—"}</td>
                    <td className="py-2 pr-4 text-navy/60">{u.city || "—"}</td>
                    <td className="py-2 pr-4 capitalize text-navy/60">{u.gender || "—"}</td>
                    <td className="py-2 pr-4">
                      {u.paused ? (
                        <span className="text-xs text-terracotta">Paused</span>
                      ) : u.onboarding_complete ? (
                        <span className="text-xs text-emerald-600">Active</span>
                      ) : (
                        <span className="text-xs text-navy/30">Onboarding</span>
                      )}
                    </td>
                    <td className="py-2 text-navy/40">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  gold,
}: {
  label: string;
  value: number | string;
  gold?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 ${
        gold ? "bg-gradient-gold shadow-warm" : "bg-white/80 border border-navy/10"
      }`}
    >
      <div className="font-serif text-2xl text-navy">{value}</div>
      <div className="text-xs mt-1 text-navy/50">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-navy/60">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}
