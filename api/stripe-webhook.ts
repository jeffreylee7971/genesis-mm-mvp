import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function readBodyBuffer(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  const body = await readBodyBuffer(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: `Webhook error: ${e.message}` }));
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const partnerFound = session.metadata?.partner_found || null;

    if (!userId) {
      console.error("No user_id in session metadata");
      res.statusCode = 200;
      res.end(JSON.stringify({ received: true }));
      return;
    }

    const { error: upsertErr } = await supabase.from("success").upsert(
      { user_id: userId, partner_found: partnerFound, stripe_paid: true },
      { onConflict: "user_id" }
    );
    if (upsertErr) console.error("Supabase upsert error:", upsertErr.message);

    const { error: pauseErr } = await supabase
      .from("users_meta")
      .update({ paused: true })
      .eq("id", userId);
    if (pauseErr) console.error("Could not pause profile:", pauseErr.message);
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ received: true }));
}
