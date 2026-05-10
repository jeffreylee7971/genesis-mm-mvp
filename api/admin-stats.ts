import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const ADMIN_EMAIL = "jeffreylee523@gmail.com";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user || user.email !== ADMIN_EMAIL) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "Forbidden" }));
    return;
  }

  const [usersMeta, matchesData, messagesCount, successData] = await Promise.all([
    supabase
      .from("users_meta")
      .select("id, name, city, gender, onboarding_complete, paused, created_at"),
    supabase.from("matches").select("status"),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("success").select("stripe_paid, marked_matched_at"),
  ]);

  const users = usersMeta.data ?? [];
  const matches = matchesData.data ?? [];
  const successes = successData.data ?? [];

  const byGender = users.reduce((acc: Record<string, number>, u) => {
    if (u.gender) acc[u.gender] = (acc[u.gender] ?? 0) + 1;
    return acc;
  }, {});

  const cityMap = users.reduce((acc: Record<string, number>, u) => {
    if (u.city) acc[u.city] = (acc[u.city] ?? 0) + 1;
    return acc;
  }, {});
  const topCities = Object.entries(cityMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([city, count]) => ({ city, count }));

  const paid = successes.filter((s) => s.stripe_paid).length;

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15)
    .map((u) => ({
      name: u.name,
      city: u.city,
      gender: u.gender,
      onboarding_complete: u.onboarding_complete,
      paused: u.paused,
      created_at: u.created_at,
    }));

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      users: {
        total: users.length,
        active: users.filter((u) => u.onboarding_complete && !u.paused).length,
        paused: users.filter((u) => u.paused).length,
        onboarding: users.filter((u) => !u.onboarding_complete).length,
        by_gender: byGender,
        top_cities: topCities,
      },
      matches: {
        total: matches.length,
        pending: matches.filter((m) => m.status === "pending").length,
        mutual: matches.filter((m) => m.status === "mutual").length,
        connected: matches.filter((m) => m.status === "connected").length,
        passed: matches.filter((m) => m.status === "passed").length,
      },
      messages: messagesCount.count ?? 0,
      success: {
        total: successes.length,
        paid,
        skipped: successes.length - paid,
        revenue: paid * 99,
      },
      recent_users: recentUsers,
    })
  );
}
