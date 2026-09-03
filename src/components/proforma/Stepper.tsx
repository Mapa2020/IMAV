import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { id: number; label: string; hint: string };

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: Step[];
  current: number;
  onSelect: (id: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {steps.map((step, i) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <li key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                active ? "bg-surface-2" : "hover:bg-surface-2/60",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-success/60 bg-success/15 text-success",
                  !active && !done && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : step.id}
              </span>
              <span className="hidden sm:block">
                <span
                  className={cn(
                    "block text-sm sm:text-base font-semibold leading-none",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground/70">{step.hint}</span>
              </span>
            </button>
            {i < steps.length - 1 && <span className="h-px w-4 bg-border sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
