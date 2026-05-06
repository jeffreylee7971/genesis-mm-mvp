import { Link } from "react-router-dom";
import heroImg from "@/assets/genesis-hero.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImg}
            alt="A vase of dried wildflowers in soft golden morning light"
            width={1536}
            height={1024}
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cream/40 via-cream/60 to-cream" />
        </div>

        <div className="container flex min-h-[88vh] flex-col justify-center py-20 md:py-28">
          <div className="max-w-2xl animate-fade-up">
            <p className="mb-6 font-sans text-sm uppercase tracking-[0.25em] text-terracotta">
              Genesis
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] text-navy md:text-7xl">
              For people ready to build a&nbsp;family.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-navy/75 md:text-xl">
              The first dating platform designed exclusively for people actively looking for a partner to start
              or grow a family with. No swiping. No games. No artificial urgency.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Button asChild size="xl" variant="warm">
                  <Link to="/dashboard">Open your matches</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="xl" variant="warm">
                    <Link to="/auth?mode=signup">Begin Genesis</Link>
                  </Button>
                  <Button asChild size="xl" variant="quiet">
                    <Link to="/auth?mode=signin">I already have an account</Link>
                  </Button>
                </>
              )}
            </div>

            <p className="mt-6 text-sm italic text-navy/50">
              Free to use. We only succeed when you find your person.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="container py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-3">
          {[
            {
              title: "Intent over interest",
              body:
                "Family-formation is the admission criterion to join — not just another filter. Everyone here has answered the same honest question.",
            },
            {
              title: "Depth over volume",
              body:
                "You'll see three to five thoughtful matches a day, not a stack of strangers. Each one comes with the why.",
            },
            {
              title: "Outcomes over engagement",
              body:
                "We win when you leave. No streaks, no badges, no metrics. Just a calm space to find the right person.",
            },
          ].map((p) => (
            <div key={p.title} className="letter-card p-8 transition-shadow hover:shadow-warm">
              <h3 className="font-serif text-2xl text-navy">{p.title}</h3>
              <p className="mt-4 leading-relaxed text-navy/70">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="bg-gradient-navy py-20 text-cream md:py-28">
        <div className="container max-w-2xl text-center">
          <h2 className="font-serif text-4xl md:text-5xl">A different kind of dating app.</h2>
          <p className="mt-6 text-lg leading-relaxed text-cream/80">
            If you're tired of the swipe carousel and ready to actually build a life with someone — Genesis was made
            for you.
          </p>
          <div className="mt-10">
            <Button asChild size="xl" variant="gold">
              <Link to={user ? "/dashboard" : "/auth?mode=signup"}>
                {user ? "Open your matches" : "Begin Genesis"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="container py-10 text-center text-sm text-navy/50">
        <p>© {new Date().getFullYear()} Genesis. Built with intention.</p>
      </footer>
    </div>
  );
};

export default Landing;
