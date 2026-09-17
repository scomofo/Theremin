import { useCallback, useEffect, useRef, useState } from "react";
import { EtherphoneEngine, type Waveform } from "@/lib/etherphone/engine";
import { Controls } from "./controls";
import { MuteButton } from "./mute-button";
import { PitchReadout } from "./pitch-readout";
import { PlayField, type PlayFieldHandle } from "./play-field";
import { StartGate } from "./start-gate";

const WAVEFORMS: Waveform[] = ["sine", "triangle", "square", "sawtooth"];
const STORAGE_WAVE = "etherphone.waveform";
const STORAGE_REVERB = "etherphone.reverb";

function readStoredWaveform(): Waveform {
  if (typeof window === "undefined") return "sine";
  const value = window.localStorage.getItem(STORAGE_WAVE);
  return WAVEFORMS.includes(value as Waveform) ? (value as Waveform) : "sine";
}

function readStoredReverb(): number {
  if (typeof window === "undefined") return 0.36;
  const raw = window.localStorage.getItem(STORAGE_REVERB);
  if (raw == null || raw === "") return 0.36;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.36;
}

export function EtherphoneApp() {
  const engineRef = useRef<EtherphoneEngine | null>(null);
  const fieldRef = useRef<PlayFieldHandle>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const pendingPointRef = useRef<{ clientX: number; clientY: number } | null>(
    null,
  );
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [reverb, setReverb] = useState(0.36);

  useEffect(() => {
    setWaveform(readStoredWaveform());
    setReverb(readStoredReverb());
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const begin = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (engineRef.current) return;
      const engine = new EtherphoneEngine();
      engine.unlock();
      engine.setWaveform(waveform);
      engine.setReverb(reverb);
      engine.setMuted(muted);
      engineRef.current = engine;
      pendingPointRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      setStarted(true);
    },
    [muted, reverb, waveform],
  );

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const onWaveform = useCallback((next: Waveform) => {
    setWaveform(next);
    engineRef.current?.setWaveform(next);
    try {
      window.localStorage.setItem(STORAGE_WAVE, next);
    } catch {
      /* ignore quota */
    }
  }, []);

  const onReverb = useCallback((next: number) => {
    setReverb(next);
    engineRef.current?.setReverb(next);
    try {
      window.localStorage.setItem(STORAGE_REVERB, String(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "KeyM") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMute]);

  useEffect(() => {
    if (!started) return;
    const point = pendingPointRef.current;
    pendingPointRef.current = null;
    if (!point) return;
    fieldRef.current?.playAtClient(point.clientX, point.clientY);
  }, [started]);

  useEffect(() => {
    const onVis = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (document.visibilityState === "visible") engine.unlock();
      else engine.setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!started) {
    return (
      <div className="min-h-0 overflow-hidden bg-bg text-fg">
        <StartGate onBegin={begin} />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <header className="flex shrink-0 items-center justify-between gap-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))]">
        <div className="min-w-0">
          <p className="font-display text-lg leading-none font-medium tracking-tight sm:text-xl">
            Etherphone
          </p>
          <p className="mt-1 hidden text-xs text-muted sm:block">
            Pitch on X · volume on Y
          </p>
        </div>
        <PitchReadout ref={readoutRef} className="flex-1" />
        <MuteButton muted={muted} onToggle={toggleMute} />
      </header>

      <main className="flex min-h-0 flex-1 flex-col pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="min-h-0 flex-1">
          <PlayField
            ref={fieldRef}
            engine={engineRef.current}
            muted={muted}
            started={started}
            readoutRef={readoutRef}
          />
        </div>
      </main>

      <footer className="shrink-0 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.9rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
        <Controls
          waveform={waveform}
          reverb={reverb}
          onWaveform={onWaveform}
          onReverb={onReverb}
        />
      </footer>
    </div>
  );
}
