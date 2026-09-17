import type { Waveform } from "@/lib/etherphone/engine";
import { cn } from "@/lib/utils";
import {
  SawWaveIcon,
  SineWaveIcon,
  SquareWaveIcon,
  TriangleWaveIcon,
} from "./wave-icons";

const WAVES: { id: Waveform; label: string; icon: typeof SineWaveIcon }[] = [
  { id: "sine", label: "Sine", icon: SineWaveIcon },
  { id: "triangle", label: "Triangle", icon: TriangleWaveIcon },
  { id: "square", label: "Square", icon: SquareWaveIcon },
  { id: "sawtooth", label: "Saw", icon: SawWaveIcon },
];

type ControlsProps = {
  waveform: Waveform;
  reverb: number;
  onWaveform: (wave: Waveform) => void;
  onReverb: (value: number) => void;
};

export function Controls({
  waveform,
  reverb,
  onWaveform,
  onReverb,
}: ControlsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div
        role="radiogroup"
        aria-label="Waveform"
        className="grid grid-cols-4 rounded-lg bg-surface p-1 shadow-[0_0_0_1px_rgba(244,244,242,0.08)]"
      >
        {WAVES.map((wave) => {
          const selected = waveform === wave.id;
          const Icon = wave.icon;
          return (
            <button
              key={wave.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onWaveform(wave.id)}
              className={cn(
                "flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-medium tracking-wide transition-[background-color,color,opacity] duration-150 ease-out",
                selected
                  ? "bg-raised text-fg"
                  : "text-muted hover:text-fg",
              )}
            >
              <Icon />
              <span>{wave.label}</span>
            </button>
          );
        })}
      </div>

      <label className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-xs font-medium tracking-[0.16em] text-muted uppercase">
          Reverb
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={reverb}
          onChange={(event) => onReverb(Number(event.target.value))}
          aria-valuetext={`${Math.round(reverb * 100)} percent reverb`}
          className="reverb-slider h-11 w-full"
        />
        <span className="w-8 text-right text-xs text-muted tabular-nums">
          {Math.round(reverb * 100)}
        </span>
      </label>
    </div>
  );
}
