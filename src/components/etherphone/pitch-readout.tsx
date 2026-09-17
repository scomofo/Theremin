import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type PitchReadoutProps = {
  className?: string;
};

export const PitchReadout = forwardRef<HTMLDivElement, PitchReadoutProps>(
  function PitchReadout({ className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-w-0 items-baseline justify-center gap-3 text-fg",
          className,
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          data-note
          className="font-display text-3xl leading-none font-medium tracking-tight tabular-nums sm:text-4xl"
        >
          —
        </span>
        <span
          data-hz
          className="text-sm text-muted tabular-nums sm:text-base"
        >
          Hz
        </span>
        <span
          data-cents
          className="hidden text-xs text-muted tabular-nums sm:inline"
        />
      </div>
    );
  },
);
