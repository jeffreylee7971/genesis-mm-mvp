import { Progress } from "@/components/ui/progress";

export default function StepHeader({
  step,
  total,
  eyebrow,
  title,
  intro,
}: {
  step: number;
  total: number;
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="mb-8 animate-fade-up">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-navy/50">
        <span>{eyebrow ?? `Step ${step} of ${total}`}</span>
        <span>{Math.round((step / total) * 100)}%</span>
      </div>
      <Progress value={(step / total) * 100} className="mb-8 h-1 bg-cream-deep [&>div]:bg-terracotta" />
      <h1 className="font-serif text-3xl leading-tight text-navy md:text-4xl">{title}</h1>
      {intro && <p className="mt-4 leading-relaxed text-navy/70">{intro}</p>}
    </div>
  );
}
