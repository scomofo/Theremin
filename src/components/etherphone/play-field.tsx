import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from "react";
import type { EtherphoneEngine } from "@/lib/etherphone/engine";
import {
  OCTAVE_LABELS,
  clamp01,
  formatCents,
  formatHz,
  hzFromX,
  noteFromHz,
  volumeFromY,
} from "@/lib/etherphone/notes";

export type PlayFieldHandle = {
  playAtClient: (clientX: number, clientY: number) => void;
};

type PlayFieldProps = {
  engine: EtherphoneEngine | null;
  muted: boolean;
  started: boolean;
  readoutRef: RefObject<HTMLDivElement | null>;
};

type Point = { x: number; y: number; v: number; life: number };

const TRAIL_MAX = 140;

export const PlayField = forwardRef<PlayFieldHandle, PlayFieldProps>(
  function PlayField({ engine, muted, started, readoutRef }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playingRef = useRef(false);
    const pressRef = useRef(false);
    const cursorRef = useRef({ x: 0.5, y: 0.55 });
    const drawRef = useRef({ x: 0.5, y: 0.55 });
    const trailRef = useRef<Point[]>([]);
    const engineRef = useRef(engine);
    const mutedRef = useRef(muted);
    const startedRef = useRef(started);
    const hintRef = useRef<HTMLParagraphElement>(null);
    const heardRef = useRef(false);
    const scopeBuf = useRef<Float32Array<ArrayBuffer> | null>(null);

    engineRef.current = engine;
    mutedRef.current = muted;
    startedRef.current = started;

    const normFromClient = (clientX: number, clientY: number) => {
      const host = hostRef.current;
      if (!host) return { x: 0.5, y: 0.55, inside: false };
      const rect = host.getBoundingClientRect();
      const x = clamp01((clientX - rect.left) / Math.max(rect.width, 1));
      const y = clamp01((clientY - rect.top) / Math.max(rect.height, 1));
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      return { x, y, inside };
    };

    const applyMove = (x: number, y: number, playing: boolean) => {
      cursorRef.current = { x, y };
      const eng = engineRef.current;
      if (!eng) return;
      eng.move(x, y);
      if (playing !== playingRef.current) {
        playingRef.current = playing;
        eng.setPlaying(playing);
      }
      if (playing && !heardRef.current) {
        heardRef.current = true;
        hintRef.current?.classList.add("opacity-0");
      }
      writeReadout(x, y, playing, mutedRef.current, readoutRef.current);
    };

    const playAt = (clientX: number, clientY: number, playing: boolean) => {
      const { x, y } = normFromClient(clientX, clientY);
      applyMove(x, y, playing);
    };

    useImperativeHandle(ref, () => ({
      playAtClient(clientX, clientY) {
        const { inside } = normFromClient(clientX, clientY);
        playAt(clientX, clientY, inside);
      },
    }));

    useEffect(() => {
      writeReadout(
        cursorRef.current.x,
        cursorRef.current.y,
        false,
        muted,
        readoutRef.current,
      );
    }, [muted, readoutRef]);

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const onPointerMove = (event: PointerEvent) => {
        if (!startedRef.current || !engineRef.current) return;
        if (pressRef.current) {
          playAt(event.clientX, event.clientY, true);
          return;
        }
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        const { x, y, inside } = normFromClient(event.clientX, event.clientY);
        applyMove(x, y, inside);
      };

      const onPointerDown = (event: PointerEvent) => {
        if (!startedRef.current || !engineRef.current) return;
        if (event.pointerType === "mouse") return;
        if (!host.contains(event.target as Node)) return;
        pressRef.current = true;
        host.setPointerCapture(event.pointerId);
        playAt(event.clientX, event.clientY, true);
      };

      const onPointerUp = (event: PointerEvent) => {
        if (!pressRef.current) return;
        pressRef.current = false;
        if (host.hasPointerCapture(event.pointerId)) {
          host.releasePointerCapture(event.pointerId);
        }
        applyMove(cursorRef.current.x, cursorRef.current.y, false);
      };

      const onPointerLeaveWindow = () => {
        if (pressRef.current) return;
        if (playingRef.current) {
          applyMove(cursorRef.current.x, cursorRef.current.y, false);
        }
      };

      window.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      document.addEventListener("mouseleave", onPointerLeaveWindow);

      return () => {
        window.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        document.removeEventListener("mouseleave", onPointerLeaveWindow);
      };
    }, []);

    useEffect(() => {
      const host = hostRef.current;
      const canvas = canvasRef.current;
      if (!host || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let raf = 0;
      let last = performance.now();
      let width = 0;
      let height = 0;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const resize = () => {
        const rect = host.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      const tick = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const target = cursorRef.current;
        const draw = drawRef.current;
        const follow = 1 - Math.exp(-(reduceMotion ? 28 : 14) * dt);
        draw.x += (target.x - draw.x) * follow;
        draw.y += (target.y - draw.y) * follow;
        const vol = playingRef.current ? volumeFromY(draw.y) : 0;

        if (!reduceMotion && playingRef.current) {
          const trail = trailRef.current;
          const prev = trail[trail.length - 1];
          const dist = prev
            ? Math.hypot(draw.x - prev.x, draw.y - prev.y)
            : 0;
          const steps = Math.min(8, Math.max(1, Math.ceil(dist * 90)));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            trail.push({
              x: prev ? prev.x + (draw.x - prev.x) * t : draw.x,
              y: prev ? prev.y + (draw.y - prev.y) * t : draw.y,
              v: vol,
              life: 1,
            });
          }
          while (trail.length > TRAIL_MAX) trail.shift();
        }
        for (const p of trailRef.current) p.life -= dt * 0.42;
        trailRef.current = trailRef.current.filter((p) => p.life > 0);

        paintField(ctx, width, height, {
          x: draw.x,
          y: draw.y,
          vol,
          playing: playingRef.current,
          muted: mutedRef.current,
          trail: trailRef.current,
          analyser: engineRef.current?.analyser ?? null,
          scopeBuf: scopeBuf.current,
          reduceMotion,
        });

        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
      };
    }, []);

    useEffect(() => {
      const eng = engine;
      if (!eng) return;
      const size = eng.analyser.fftSize;
      if (!scopeBuf.current || scopeBuf.current.length !== size) {
        scopeBuf.current = new Float32Array(size);
      }
    }, [engine]);

    return (
      <div
        ref={hostRef}
        className="crt-face relative h-full min-h-0 overflow-hidden rounded-xl touch-none select-none"
        role="application"
        aria-label="Theremin play field. Horizontal position is pitch, vertical is volume."
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-3 pt-3 sm:px-4">
          {OCTAVE_LABELS.map((label) => (
            <span
              key={label}
              className="text-xs font-medium tracking-wide text-phosphor/55 tabular-nums"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="pointer-events-none absolute top-9 bottom-14 left-3 flex flex-col justify-between sm:left-4">
          <span className="text-xs font-medium tracking-[0.18em] text-phosphor/45 uppercase">
            Loud
          </span>
          <span className="text-xs font-medium tracking-[0.18em] text-phosphor/45 uppercase">
            Quiet
          </span>
        </div>

        <p className="pointer-events-none absolute right-3 bottom-3 text-xs font-medium tracking-[0.18em] text-phosphor/45 uppercase sm:right-4">
          Pitch
        </p>

        <p
          ref={hintRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-phosphor/60 transition-opacity duration-300 ease-out"
        >
          {started ? "Move to play" : "The field"}
        </p>
      </div>
    );
  },
);

function writeReadout(
  x: number,
  y: number,
  playing: boolean,
  muted: boolean,
  root: HTMLDivElement | null,
) {
  if (!root) return;
  const hz = hzFromX(x);
  const note = noteFromHz(hz);
  const noteEl = root.querySelector("[data-note]");
  const hzEl = root.querySelector("[data-hz]");
  const centsEl = root.querySelector("[data-cents]");
  if (noteEl) noteEl.textContent = note.label;
  if (hzEl) hzEl.textContent = `${formatHz(hz)} Hz`;
  if (centsEl) {
    centsEl.textContent = muted
      ? "muted"
      : playing
        ? formatCents(note.cents)
        : "rest";
  }
  root.setAttribute(
    "aria-label",
    muted
      ? `Muted at ${note.label}, ${formatHz(hz)} hertz`
      : playing
        ? `Playing ${note.label}, ${formatHz(hz)} hertz, ${formatCents(note.cents)}`
        : `Ready at ${note.label}`,
  );
}

function paintField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: {
    x: number;
    y: number;
    vol: number;
    playing: boolean;
    muted: boolean;
    trail: Point[];
    analyser: AnalyserNode | null;
    scopeBuf: Float32Array<ArrayBuffer> | null;
    reduceMotion: boolean;
  },
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgb(6, 17, 12)";
  ctx.fillRect(0, 0, w, h);

  drawGraticule(ctx, w, h);

  const px = state.x * w;
  const py = state.y * h;
  const dim = state.muted ? 0.35 : 1;

  ctx.globalCompositeOperation = "lighter";

  if (!state.reduceMotion && state.trail.length > 1) {
    for (let i = 1; i < state.trail.length; i++) {
      const a = state.trail[i - 1];
      const b = state.trail[i];
      if (!a || !b) continue;
      const persist = b.life;
      const bloom = persist * persist;
      const energy = dim * (0.4 + b.v);

      ctx.strokeStyle = `rgba(40, 180, 80, ${0.16 * bloom * energy})`;
      ctx.lineWidth = 18 * (0.35 + persist);
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();

      ctx.strokeStyle = `rgba(125, 255, 154, ${0.42 * persist * energy})`;
      ctx.lineWidth = 4.2 * (0.45 + persist);
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();

      ctx.strokeStyle = `rgba(220, 255, 230, ${0.8 * persist * energy})`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
  }

  if (state.playing) {
    ctx.strokeStyle = `rgba(125, 255, 154, ${0.08 * dim})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }

  drawScope(ctx, w, h, state, dim);

  if (state.playing) {
    const r = 3.2 + state.vol * 5.5;
    const bloom = ctx.createRadialGradient(px, py, 0, px, py, r * 7);
    bloom.addColorStop(
      0,
      `rgba(210, 255, 220, ${0.55 * dim * (0.4 + state.vol)})`,
    );
    bloom.addColorStop(0.22, `rgba(125, 255, 154, ${0.22 * dim})`);
    bloom.addColorStop(1, "rgba(125, 255, 154, 0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(px, py, r * 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(230, 255, 236, ${0.92 * dim})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(
    w * 0.5,
    h * 0.5,
    Math.min(w, h) * 0.28,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.72,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawGraticule(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i <= 4; i++) {
    const x = (i / 4) * w;
    ctx.strokeStyle =
      i === 2 ? "rgba(125, 255, 154, 0.22)" : "rgba(125, 255, 154, 0.1)";
    ctx.lineWidth = i === 2 ? 1.15 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let oct = 0; oct < 4; oct++) {
    for (let k = 1; k <= 3; k++) {
      const x = ((oct + k / 4) / 4) * w;
      ctx.strokeStyle = "rgba(125, 255, 154, 0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  for (const t of [0.25, 0.5, 0.75]) {
    ctx.strokeStyle =
      t === 0.5 ? "rgba(125, 255, 154, 0.16)" : "rgba(125, 255, 154, 0.07)";
    ctx.lineWidth = 1;
    ctx.setLineDash(t === 0.5 ? [] : [3, 7]);
    ctx.beginPath();
    ctx.moveTo(0, t * h);
    ctx.lineTo(w, t * h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(125, 255, 154, 0.18)";
  ctx.lineWidth = 1;
  const tick = 6;
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * w;
    const y = (i / 20) * h;
    const major = i % 5 === 0;
    const len = major ? tick : tick * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.5 - len);
    ctx.lineTo(x, h * 0.5 + len);
    ctx.moveTo(w * 0.5 - len, y);
    ctx.lineTo(w * 0.5 + len, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawScope(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: {
    analyser: AnalyserNode | null;
    scopeBuf: Float32Array<ArrayBuffer> | null;
    muted: boolean;
    playing: boolean;
  },
  dim: number,
) {
  const buf = state.scopeBuf;
  const analyser = state.analyser;
  if (!buf || !analyser || buf.length < analyser.fftSize) return;

  analyser.getFloatTimeDomainData(buf);

  const base = h - 36;
  const amp = 26;
  const step = Math.max(1, Math.floor(buf.length / Math.max(w, 1)));

  ctx.beginPath();
  for (let i = 0; i < buf.length; i += step) {
    const x = (i / (buf.length - 1)) * w;
    const y = base + (buf[i] ?? 0) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(40, 180, 80, ${0.18 * dim})`;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < buf.length; i += step) {
    const x = (i / (buf.length - 1)) * w;
    const y = base + (buf[i] ?? 0) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(125, 255, 154, ${0.7 * dim})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}
