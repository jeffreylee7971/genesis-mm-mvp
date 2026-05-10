import Stripe from "stripe";
import type { IncomingMessage, ServerResponse } from "http";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let userId: string;
  let partnerFound: string | null;
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw);
    userId = body.user_id;
    partnerFound = body.partner_found ?? null;
    if (!userId) throw new Error("missing user_id");
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "user_id required" }));
    return;
  }

  const baseUrl = "https://genesis-mm-mvp.vercel.app";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Genesis Celebration Fee",
              description: "One-time fee — you found your person.",
            },
            unit_amount: 9900,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/found-my-person`,
      metadata: {
        user_id: userId,
        partner_found: partnerFound ?? "",
      },
    });

    res.statusCode = 200;
    res.end(JSON.stringify({ url: session.url }));
  } catch (e: any) {
    console.error("Stripe checkout creation failed:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message ?? "checkout creation failed" }));
  }
}
