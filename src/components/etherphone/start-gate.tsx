import { Button } from "@/components/ui/button";

type StartGateProps = {
  onBegin: (point: { clientX: number; clientY: number }) => void;
};

export function StartGate({ onBegin }: StartGateProps) {
  return (
    <div className="flex h-dvh min-h-0 items-center justify-center bg-bg px-6">
      <button
        type="button"
        onClick={(event) =>
          onBegin({ clientX: event.clientX, clientY: event.clientY })
        }
        className="flex w-full max-w-lg cursor-pointer flex-col items-center text-center"
        aria-label="Begin playing Etherphone"
      >
        <p className="stagger-item text-xs font-medium tracking-[0.28em] text-muted uppercase">
          Etherphone
        </p>
        <h1 className="stagger-item mt-4 font-display text-4xl leading-tight font-medium tracking-tight text-fg text-balance sm:text-6xl">
          A theremin for the pointer.
        </h1>
        <div className="stagger-item mt-8 grid w-full max-w-sm grid-cols-2 gap-3 text-left text-sm leading-snug text-muted">
          <GuideCard axis="Pitch" hint="left → right" detail="Low to high" />
          <GuideCard axis="Volume" hint="down → up" detail="Quiet to loud" />
        </div>
        <span className="stagger-item mt-10">
          <Button size="lg" asChild>
            <span>Click or tap to begin</span>
          </Button>
        </span>
        <p className="stagger-item mt-4 text-xs text-muted">
          Sound unlocks with this gesture. Space mutes.
        </p>
      </button>
    </div>
  );
}

function GuideCard({
  axis,
  hint,
  detail,
}: {
  axis: string;
  hint: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3.5 text-left shadow-[0_0_0_1px_rgba(244,244,242,0.08)]">
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
        {axis}
      </p>
      <p className="mt-1.5 font-medium text-fg">{hint}</p>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
    </div>
  );
}
