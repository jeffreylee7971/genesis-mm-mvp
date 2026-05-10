import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function PaymentSuccess() {
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
          Thank you for the celebration fee. We hope you'll think of Genesis
          fondly — and tell other thoughtful people about it. Your profile is
          paused. Go live your life.
        </p>
        <Button asChild variant="quiet" size="lg" className="mt-10">
          <Link to="/">Return home</Link>
        </Button>
      </div>
    </AppShell>
  );
}
