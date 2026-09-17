export const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const;

/** C2 — left edge of the field. */
export const MIN_HZ = 65.40639132514966;
/** C6 — right edge of the field. Four octaves, C4 at center. */
export const MAX_HZ = 1046.5022612023945;

export const OCTAVE_LABELS = ["C2", "C3", "C4", "C5", "C6"] as const;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function hzFromX(x: number): number {
  return MIN_HZ * (MAX_HZ / MIN_HZ) ** clamp01(x);
}

export function xFromHz(hz: number): number {
  return clamp01(Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ));
}

export function midiFromHz(hz: number): number {
  return 69 + 12 * Math.log2(Math.max(hz, 1) / 440);
}

export function noteFromHz(hz: number): {
  name: string;
  octave: number;
  label: string;
  cents: number;
} {
  const midi = midiFromHz(hz);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12] ?? "C";
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave, label: `${name}${octave}`, cents };
}

export function formatHz(hz: number): string {
  if (hz < 100) return hz.toFixed(1);
  return hz.toFixed(0);
}

export function formatCents(cents: number): string {
  if (cents === 0) return "in tune";
  const sign = cents > 0 ? "+" : "−";
  return `${sign}${Math.abs(cents)}¢`;
}

/** Volume from normalized Y (0 at top / loud, 1 at bottom / quiet). */
export function volumeFromY(y: number): number {
  const up = 1 - clamp01(y);
  const gated = Math.max(0, (up - 0.02) / 0.98);
  return gated ** 1.65;
}
