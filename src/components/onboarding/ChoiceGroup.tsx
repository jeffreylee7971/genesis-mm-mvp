import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export default function ChoiceGroup({
  options,
  value,
  onChange,
  cols = 1,
}: {
  options: readonly Option[];
  value: string | undefined;
  onChange: (v: string) => void;
  cols?: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-3", cols === 2 && "sm:grid-cols-2")}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-xl border px-5 py-4 text-left text-base transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-terracotta bg-terracotta/5 text-navy shadow-warm"
                : "border-border bg-background hover:border-terracotta/40 hover:bg-cream-deep/40",
            )}
          >
            <span className="block font-medium">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
