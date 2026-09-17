import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Volume2, t as VolumeX } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CvytEjfq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Stereo plate-ish impulse: short bright onset, exponential noise tail. */
function createReverbImpulse(ctx, duration = 1.85, decay = 2.6) {
	const rate = ctx.sampleRate;
	const length = Math.max(1, Math.floor(rate * duration));
	const impulse = ctx.createBuffer(2, length, rate);
	for (let channel = 0; channel < 2; channel++) {
		const data = impulse.getChannelData(channel);
		for (let i = 0; i < length; i++) {
			const env = (1 - i / length) ** decay;
			const noise = Math.random() * 2 - 1;
			const bright = .35 + .65 * Math.min(1, i / (rate * .012));
			data[i] = noise * env * bright;
		}
	}
	return impulse;
}
var NOTE_NAMES = [
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
	"B"
];
/** C2 — left edge of the field. */
var MIN_HZ = 65.40639132514966;
/** C6 — right edge of the field. Four octaves, C4 at center. */
var MAX_HZ = 1046.5022612023945;
var OCTAVE_LABELS = [
	"C2",
	"C3",
	"C4",
	"C5",
	"C6"
];
function clamp01(value) {
	return Math.min(1, Math.max(0, value));
}
function hzFromX(x) {
	return MIN_HZ * (MAX_HZ / MIN_HZ) ** clamp01(x);
}
function midiFromHz(hz) {
	return 69 + 12 * Math.log2(Math.max(hz, 1) / 440);
}
function noteFromHz(hz) {
	const midi = midiFromHz(hz);
	const rounded = Math.round(midi);
	const cents = Math.round((midi - rounded) * 100);
	const name = NOTE_NAMES[(rounded % 12 + 12) % 12] ?? "C";
	const octave = Math.floor(rounded / 12) - 1;
	return {
		name,
		octave,
		label: `${name}${octave}`,
		cents
	};
}
function formatHz(hz) {
	if (hz < 100) return hz.toFixed(1);
	return hz.toFixed(0);
}
function formatCents(cents) {
	if (cents === 0) return "in tune";
	return `${cents > 0 ? "+" : "−"}${Math.abs(cents)}¢`;
}
/** Volume from normalized Y (0 at top / loud, 1 at bottom / quiet). */
function volumeFromY(y) {
	const up = 1 - clamp01(y);
	return Math.max(0, (up - .02) / .98) ** 1.65;
}
var WAVE_MIX = {
	sine: {
		sub: .2,
		air: .07,
		filterMul: 14,
		filterQ: .4
	},
	triangle: {
		sub: .16,
		air: .05,
		filterMul: 10,
		filterQ: .55
	},
	square: {
		sub: .1,
		air: 0,
		filterMul: 5.5,
		filterQ: .7
	},
	sawtooth: {
		sub: .12,
		air: 0,
		filterMul: 6.2,
		filterQ: .65
	}
};
var EtherphoneEngine = class {
	ctx;
	analyser;
	osc;
	sub;
	air;
	subGain;
	airGain;
	voice;
	filter;
	panner;
	dry;
	wet;
	delay;
	convolver;
	compressor;
	master;
	muteGain;
	waveform = "sine";
	muted = false;
	playing = false;
	lastX = .5;
	lastY = .55;
	disposed = false;
	constructor() {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		this.ctx = new AudioCtx({ latencyHint: "interactive" });
		this.osc = this.ctx.createOscillator();
		this.sub = this.ctx.createOscillator();
		this.air = this.ctx.createOscillator();
		this.subGain = this.ctx.createGain();
		this.airGain = this.ctx.createGain();
		this.voice = this.ctx.createGain();
		this.filter = this.ctx.createBiquadFilter();
		this.panner = this.ctx.createStereoPanner();
		this.dry = this.ctx.createGain();
		this.wet = this.ctx.createGain();
		this.delay = this.ctx.createDelay(.05);
		this.convolver = this.ctx.createConvolver();
		this.compressor = this.ctx.createDynamicsCompressor();
		this.master = this.ctx.createGain();
		this.muteGain = this.ctx.createGain();
		this.analyser = this.ctx.createAnalyser();
		this.osc.type = "sine";
		this.sub.type = "sine";
		this.air.type = "sine";
		this.osc.frequency.value = hzFromX(.5);
		this.sub.frequency.value = hzFromX(.5) * .5;
		this.air.frequency.value = hzFromX(.5) * 2;
		this.subGain.gain.value = WAVE_MIX.sine.sub;
		this.airGain.gain.value = WAVE_MIX.sine.air;
		this.voice.gain.value = 0;
		this.filter.type = "lowpass";
		this.filter.frequency.value = 4e3;
		this.filter.Q.value = WAVE_MIX.sine.filterQ;
		this.panner.pan.value = 0;
		this.dry.gain.value = .91;
		this.wet.gain.value = .22;
		this.delay.delayTime.value = .018;
		this.convolver.buffer = createReverbImpulse(this.ctx);
		this.compressor.threshold.value = -14;
		this.compressor.knee.value = 18;
		this.compressor.ratio.value = 3.2;
		this.compressor.attack.value = .006;
		this.compressor.release.value = .18;
		this.master.gain.value = .72;
		this.muteGain.gain.value = 1;
		this.analyser.fftSize = 2048;
		this.analyser.smoothingTimeConstant = .45;
		this.osc.connect(this.filter);
		this.sub.connect(this.subGain);
		this.subGain.connect(this.filter);
		this.air.connect(this.airGain);
		this.airGain.connect(this.filter);
		this.filter.connect(this.voice);
		this.voice.connect(this.panner);
		this.panner.connect(this.dry);
		this.panner.connect(this.delay);
		this.delay.connect(this.convolver);
		this.convolver.connect(this.wet);
		this.dry.connect(this.compressor);
		this.wet.connect(this.compressor);
		this.compressor.connect(this.master);
		this.master.connect(this.analyser);
		this.analyser.connect(this.muteGain);
		this.muteGain.connect(this.ctx.destination);
		this.osc.start();
		this.sub.start();
		this.air.start();
	}
	unlock() {
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	setWaveform(type) {
		this.waveform = type;
		this.osc.type = type;
		const mix = WAVE_MIX[type];
		const now = this.ctx.currentTime;
		this.subGain.gain.setTargetAtTime(mix.sub, now, .04);
		this.airGain.gain.setTargetAtTime(mix.air, now, .04);
		this.filter.Q.setTargetAtTime(mix.filterQ, now, .05);
		this.applyVoice(this.lastX, this.lastY, true);
	}
	setReverb(amount) {
		const a = clamp01(amount);
		const now = this.ctx.currentTime;
		this.wet.gain.setTargetAtTime(a * .64, now, .06);
		this.dry.gain.setTargetAtTime(1 - a * .28, now, .06);
	}
	setMuted(muted) {
		this.muted = muted;
		const now = this.ctx.currentTime;
		this.muteGain.gain.setTargetAtTime(muted ? 0 : 1, now, .02);
	}
	setPlaying(playing) {
		this.playing = playing;
		this.applyVoice(this.lastX, this.lastY);
	}
	/** x,y in 0..1. x = pitch (left low), y = volume (top loud). */
	move(x, y) {
		this.lastX = clamp01(x);
		this.lastY = clamp01(y);
		this.applyVoice(this.lastX, this.lastY);
	}
	applyVoice(x, y, forceFilter = false) {
		if (this.disposed) return;
		const now = this.ctx.currentTime;
		const hz = hzFromX(x);
		const mix = WAVE_MIX[this.waveform];
		const vol = this.playing ? volumeFromY(y) * .42 : 0;
		const tau = this.playing ? .038 : .09;
		this.osc.frequency.setTargetAtTime(hz, now, .045);
		this.sub.frequency.setTargetAtTime(hz * .5, now, .045);
		this.air.frequency.setTargetAtTime(hz * 2, now, .045);
		this.voice.gain.setTargetAtTime(vol, now, tau);
		this.panner.pan.setTargetAtTime((x * 2 - 1) * .48, now, .06);
		if (this.playing || forceFilter) {
			const cutoff = Math.min(14e3, Math.max(280, hz * mix.filterMul));
			this.filter.frequency.setTargetAtTime(cutoff, now, .06);
		}
	}
	get isMuted() {
		return this.muted;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		try {
			this.osc.stop();
			this.sub.stop();
			this.air.stop();
		} catch {}
		this.ctx.close();
	}
};
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function WaveSvg(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 28 16",
		fill: "none",
		"aria-hidden": "true",
		className: "h-3.5 w-6",
		...props
	});
}
function SineWaveIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveSvg, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		d: "M1 8c2.2-7 4.4-7 6.6 0s4.4 7 6.6 0 4.4-7 6.6 0 4.4 7 6.2 0",
		stroke: "currentColor",
		strokeWidth: "1.5",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	}) });
}
function TriangleWaveIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveSvg, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		d: "M1 8 7.5 2.5 14.5 13.5 21.5 2.5 27 8",
		stroke: "currentColor",
		strokeWidth: "1.5",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	}) });
}
function SquareWaveIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveSvg, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		d: "M1 8V3.5h8.5V12.5h8.5V3.5H27",
		stroke: "currentColor",
		strokeWidth: "1.5",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	}) });
}
function SawWaveIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveSvg, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		d: "M1 13.5 10.5 2.5v11h9L27 2.5",
		stroke: "currentColor",
		strokeWidth: "1.5",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	}) });
}
var WAVES = [
	{
		id: "sine",
		label: "Sine",
		icon: SineWaveIcon
	},
	{
		id: "triangle",
		label: "Triangle",
		icon: TriangleWaveIcon
	},
	{
		id: "square",
		label: "Square",
		icon: SquareWaveIcon
	},
	{
		id: "sawtooth",
		label: "Saw",
		icon: SawWaveIcon
	}
];
function Controls({ waveform, reverb, onWaveform, onReverb }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			role: "radiogroup",
			"aria-label": "Waveform",
			className: "grid grid-cols-4 rounded-lg bg-surface p-1 shadow-[0_0_0_1px_rgba(244,244,242,0.08)]",
			children: WAVES.map((wave) => {
				const selected = waveform === wave.id;
				const Icon = wave.icon;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "radio",
					"aria-checked": selected,
					onClick: () => onWaveform(wave.id),
					className: cn("flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-medium tracking-wide transition-[background-color,color,opacity] duration-150 ease-out", selected ? "bg-raised text-fg" : "text-muted hover:text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: wave.label })]
				}, wave.id);
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "flex min-w-0 flex-1 items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 text-xs font-medium tracking-[0.16em] text-muted uppercase",
					children: "Reverb"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 0,
					max: 1,
					step: .01,
					value: reverb,
					onChange: (event) => onReverb(Number(event.target.value)),
					"aria-valuetext": `${Math.round(reverb * 100)} percent reverb`,
					className: "reverb-slider h-11 w-full"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-8 text-right text-xs text-muted tabular-nums",
					children: Math.round(reverb * 100)
				})
			]
		})]
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			primary: "bg-fg text-bg hover:opacity-90",
			ghost: "bg-transparent text-fg shadow-[0_0_0_1px_rgba(244,244,242,0.12)] hover:bg-raised",
			icon: "bg-raised text-fg hover:bg-raised/80"
		},
		size: {
			md: "h-11 rounded-md px-4 text-sm",
			lg: "h-12 rounded-md px-6 text-sm",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function MuteButton({ muted, onToggle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		type: "button",
		variant: "icon",
		size: "icon",
		onClick: onToggle,
		"aria-pressed": muted,
		"aria-label": muted ? "Unmute" : "Mute",
		title: muted ? "Unmute (Space)" : "Mute (Space)",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "relative block size-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-200 ease-out", muted ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, {
					className: "size-5",
					strokeWidth: 1.75
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("flex items-center justify-center transition-[opacity,transform,filter] duration-200 ease-out", muted ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, {
					className: "size-5",
					strokeWidth: 1.75
				})
			})]
		})
	});
}
var PitchReadout = (0, import_react.forwardRef)(function PitchReadout({ className }, ref) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: cn("flex min-w-0 items-baseline justify-center gap-3 text-fg", className),
		"aria-live": "polite",
		"aria-atomic": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				"data-note": true,
				className: "font-display text-3xl leading-none font-medium tracking-tight tabular-nums sm:text-4xl",
				children: "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				"data-hz": true,
				className: "text-sm text-muted tabular-nums sm:text-base",
				children: "Hz"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				"data-cents": true,
				className: "hidden text-xs text-muted tabular-nums sm:inline"
			})
		]
	});
});
var TRAIL_MAX = 140;
var PlayField = (0, import_react.forwardRef)(function PlayField({ engine, muted, started, readoutRef }, ref) {
	const hostRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const playingRef = (0, import_react.useRef)(false);
	const pressRef = (0, import_react.useRef)(false);
	const cursorRef = (0, import_react.useRef)({
		x: .5,
		y: .55
	});
	const drawRef = (0, import_react.useRef)({
		x: .5,
		y: .55
	});
	const trailRef = (0, import_react.useRef)([]);
	const engineRef = (0, import_react.useRef)(engine);
	const mutedRef = (0, import_react.useRef)(muted);
	const startedRef = (0, import_react.useRef)(started);
	const hintRef = (0, import_react.useRef)(null);
	const heardRef = (0, import_react.useRef)(false);
	const scopeBuf = (0, import_react.useRef)(null);
	engineRef.current = engine;
	mutedRef.current = muted;
	startedRef.current = started;
	const normFromClient = (clientX, clientY) => {
		const host = hostRef.current;
		if (!host) return {
			x: .5,
			y: .55,
			inside: false
		};
		const rect = host.getBoundingClientRect();
		return {
			x: clamp01((clientX - rect.left) / Math.max(rect.width, 1)),
			y: clamp01((clientY - rect.top) / Math.max(rect.height, 1)),
			inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
		};
	};
	const applyMove = (x, y, playing) => {
		cursorRef.current = {
			x,
			y
		};
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
	const playAt = (clientX, clientY, playing) => {
		const { x, y } = normFromClient(clientX, clientY);
		applyMove(x, y, playing);
	};
	(0, import_react.useImperativeHandle)(ref, () => ({ playAtClient(clientX, clientY) {
		const { inside } = normFromClient(clientX, clientY);
		playAt(clientX, clientY, inside);
	} }));
	(0, import_react.useEffect)(() => {
		writeReadout(cursorRef.current.x, cursorRef.current.y, false, muted, readoutRef.current);
	}, [muted, readoutRef]);
	(0, import_react.useEffect)(() => {
		const host = hostRef.current;
		if (!host) return;
		const onPointerMove = (event) => {
			if (!startedRef.current || !engineRef.current) return;
			if (pressRef.current) {
				playAt(event.clientX, event.clientY, true);
				return;
			}
			if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
			const { x, y, inside } = normFromClient(event.clientX, event.clientY);
			applyMove(x, y, inside);
		};
		const onPointerDown = (event) => {
			if (!startedRef.current || !engineRef.current) return;
			if (event.pointerType === "mouse") return;
			if (!host.contains(event.target)) return;
			pressRef.current = true;
			host.setPointerCapture(event.pointerId);
			playAt(event.clientX, event.clientY, true);
		};
		const onPointerUp = (event) => {
			if (!pressRef.current) return;
			pressRef.current = false;
			if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
			applyMove(cursorRef.current.x, cursorRef.current.y, false);
		};
		const onPointerLeaveWindow = () => {
			if (pressRef.current) return;
			if (playingRef.current) applyMove(cursorRef.current.x, cursorRef.current.y, false);
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
	(0, import_react.useEffect)(() => {
		const host = hostRef.current;
		const canvas = canvasRef.current;
		if (!host || !canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;
		let last = performance.now();
		let width = 0;
		let height = 0;
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
		const tick = (now) => {
			const dt = Math.min(.1, (now - last) / 1e3);
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
				const dist = prev ? Math.hypot(draw.x - prev.x, draw.y - prev.y) : 0;
				const steps = Math.min(8, Math.max(1, Math.ceil(dist * 90)));
				for (let s = 1; s <= steps; s++) {
					const t = s / steps;
					trail.push({
						x: prev ? prev.x + (draw.x - prev.x) * t : draw.x,
						y: prev ? prev.y + (draw.y - prev.y) * t : draw.y,
						v: vol,
						life: 1
					});
				}
				while (trail.length > TRAIL_MAX) trail.shift();
			}
			for (const p of trailRef.current) p.life -= dt * .42;
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
				reduceMotion
			});
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const eng = engine;
		if (!eng) return;
		const size = eng.analyser.fftSize;
		if (!scopeBuf.current || scopeBuf.current.length !== size) scopeBuf.current = new Float32Array(size);
	}, [engine]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: hostRef,
		className: "crt-face relative h-full min-h-0 overflow-hidden rounded-xl touch-none select-none",
		role: "application",
		"aria-label": "Theremin play field. Horizontal position is pitch, vertical is volume.",
		style: { touchAction: "none" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 size-full"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 top-0 flex justify-between px-3 pt-3 sm:px-4",
				children: OCTAVE_LABELS.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium tracking-wide text-phosphor/55 tabular-nums",
					children: label
				}, label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute top-9 bottom-14 left-3 flex flex-col justify-between sm:left-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium tracking-[0.18em] text-phosphor/45 uppercase",
					children: "Loud"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium tracking-[0.18em] text-phosphor/45 uppercase",
					children: "Quiet"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pointer-events-none absolute right-3 bottom-3 text-xs font-medium tracking-[0.18em] text-phosphor/45 uppercase sm:right-4",
				children: "Pitch"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				ref: hintRef,
				className: "pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-phosphor/60 transition-opacity duration-300 ease-out",
				children: started ? "Move to play" : "The field"
			})
		]
	});
});
function writeReadout(x, y, playing, muted, root) {
	if (!root) return;
	const hz = hzFromX(x);
	const note = noteFromHz(hz);
	const noteEl = root.querySelector("[data-note]");
	const hzEl = root.querySelector("[data-hz]");
	const centsEl = root.querySelector("[data-cents]");
	if (noteEl) noteEl.textContent = note.label;
	if (hzEl) hzEl.textContent = `${formatHz(hz)} Hz`;
	if (centsEl) centsEl.textContent = muted ? "muted" : playing ? formatCents(note.cents) : "rest";
	root.setAttribute("aria-label", muted ? `Muted at ${note.label}, ${formatHz(hz)} hertz` : playing ? `Playing ${note.label}, ${formatHz(hz)} hertz, ${formatCents(note.cents)}` : `Ready at ${note.label}`);
}
function paintField(ctx, w, h, state) {
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "rgb(6, 17, 12)";
	ctx.fillRect(0, 0, w, h);
	drawGraticule(ctx, w, h);
	const px = state.x * w;
	const py = state.y * h;
	const dim = state.muted ? .35 : 1;
	ctx.globalCompositeOperation = "lighter";
	if (!state.reduceMotion && state.trail.length > 1) for (let i = 1; i < state.trail.length; i++) {
		const a = state.trail[i - 1];
		const b = state.trail[i];
		if (!a || !b) continue;
		const persist = b.life;
		const bloom = persist * persist;
		const energy = dim * (.4 + b.v);
		ctx.strokeStyle = `rgba(40, 180, 80, ${.16 * bloom * energy})`;
		ctx.lineWidth = 18 * (.35 + persist);
		ctx.beginPath();
		ctx.moveTo(a.x * w, a.y * h);
		ctx.lineTo(b.x * w, b.y * h);
		ctx.stroke();
		ctx.strokeStyle = `rgba(125, 255, 154, ${.42 * persist * energy})`;
		ctx.lineWidth = 4.2 * (.45 + persist);
		ctx.beginPath();
		ctx.moveTo(a.x * w, a.y * h);
		ctx.lineTo(b.x * w, b.y * h);
		ctx.stroke();
		ctx.strokeStyle = `rgba(220, 255, 230, ${.8 * persist * energy})`;
		ctx.lineWidth = 1.35;
		ctx.beginPath();
		ctx.moveTo(a.x * w, a.y * h);
		ctx.lineTo(b.x * w, b.y * h);
		ctx.stroke();
	}
	if (state.playing) {
		ctx.strokeStyle = `rgba(125, 255, 154, ${.08 * dim})`;
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
		bloom.addColorStop(0, `rgba(210, 255, 220, ${.55 * dim * (.4 + state.vol)})`);
		bloom.addColorStop(.22, `rgba(125, 255, 154, ${.22 * dim})`);
		bloom.addColorStop(1, "rgba(125, 255, 154, 0)");
		ctx.fillStyle = bloom;
		ctx.beginPath();
		ctx.arc(px, py, r * 7, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = `rgba(230, 255, 236, ${.92 * dim})`;
		ctx.beginPath();
		ctx.arc(px, py, r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalCompositeOperation = "source-over";
	const vignette = ctx.createRadialGradient(w * .5, h * .5, Math.min(w, h) * .28, w * .5, h * .5, Math.max(w, h) * .72);
	vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
	vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, w, h);
}
function drawGraticule(ctx, w, h) {
	ctx.save();
	ctx.globalCompositeOperation = "source-over";
	for (let i = 0; i <= 4; i++) {
		const x = i / 4 * w;
		ctx.strokeStyle = i === 2 ? "rgba(125, 255, 154, 0.22)" : "rgba(125, 255, 154, 0.1)";
		ctx.lineWidth = i === 2 ? 1.15 : 1;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, h);
		ctx.stroke();
	}
	for (let oct = 0; oct < 4; oct++) for (let k = 1; k <= 3; k++) {
		const x = (oct + k / 4) / 4 * w;
		ctx.strokeStyle = "rgba(125, 255, 154, 0.045)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, h);
		ctx.stroke();
	}
	for (const t of [
		.25,
		.5,
		.75
	]) {
		ctx.strokeStyle = t === .5 ? "rgba(125, 255, 154, 0.16)" : "rgba(125, 255, 154, 0.07)";
		ctx.lineWidth = 1;
		ctx.setLineDash(t === .5 ? [] : [3, 7]);
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
		const x = i / 20 * w;
		const y = i / 20 * h;
		const len = i % 5 === 0 ? tick : tick * .55;
		ctx.beginPath();
		ctx.moveTo(x, h * .5 - len);
		ctx.lineTo(x, h * .5 + len);
		ctx.moveTo(w * .5 - len, y);
		ctx.lineTo(w * .5 + len, y);
		ctx.stroke();
	}
	ctx.restore();
}
function drawScope(ctx, w, h, state, dim) {
	const buf = state.scopeBuf;
	const analyser = state.analyser;
	if (!buf || !analyser || buf.length < analyser.fftSize) return;
	analyser.getFloatTimeDomainData(buf);
	const base = h - 36;
	const amp = 26;
	const step = Math.max(1, Math.floor(buf.length / Math.max(w, 1)));
	ctx.beginPath();
	for (let i = 0; i < buf.length; i += step) {
		const x = i / (buf.length - 1) * w;
		const y = base + (buf[i] ?? 0) * amp;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.strokeStyle = `rgba(40, 180, 80, ${.18 * dim})`;
	ctx.lineWidth = 6;
	ctx.stroke();
	ctx.beginPath();
	for (let i = 0; i < buf.length; i += step) {
		const x = i / (buf.length - 1) * w;
		const y = base + (buf[i] ?? 0) * amp;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.strokeStyle = `rgba(125, 255, 154, ${.7 * dim})`;
	ctx.lineWidth = 1.4;
	ctx.stroke();
}
function StartGate({ onBegin }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-dvh min-h-0 items-center justify-center bg-bg px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: (event) => onBegin({
				clientX: event.clientX,
				clientY: event.clientY
			}),
			className: "flex w-full max-w-lg cursor-pointer flex-col items-center text-center",
			"aria-label": "Begin playing Etherphone",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "stagger-item text-xs font-medium tracking-[0.28em] text-muted uppercase",
					children: "Etherphone"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "stagger-item mt-4 font-display text-4xl leading-tight font-medium tracking-tight text-fg text-balance sm:text-6xl",
					children: "A theremin for the pointer."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "stagger-item mt-8 grid w-full max-w-sm grid-cols-2 gap-3 text-left text-sm leading-snug text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GuideCard, {
						axis: "Pitch",
						hint: "left → right",
						detail: "Low to high"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GuideCard, {
						axis: "Volume",
						hint: "down → up",
						detail: "Quiet to loud"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "stagger-item mt-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Click or tap to begin" })
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "stagger-item mt-4 text-xs text-muted",
					children: "Sound unlocks with this gesture. Space mutes."
				})
			]
		})
	});
}
function GuideCard({ axis, hint, detail }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg bg-surface px-4 py-3.5 text-left shadow-[0_0_0_1px_rgba(244,244,242,0.08)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-[0.18em] text-muted uppercase",
				children: axis
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1.5 font-medium text-fg",
				children: hint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs text-muted",
				children: detail
			})
		]
	});
}
var WAVEFORMS = [
	"sine",
	"triangle",
	"square",
	"sawtooth"
];
var STORAGE_WAVE = "etherphone.waveform";
var STORAGE_REVERB = "etherphone.reverb";
function readStoredWaveform() {
	if (typeof window === "undefined") return "sine";
	const value = window.localStorage.getItem(STORAGE_WAVE);
	return WAVEFORMS.includes(value) ? value : "sine";
}
function readStoredReverb() {
	if (typeof window === "undefined") return .36;
	const raw = window.localStorage.getItem(STORAGE_REVERB);
	if (raw == null || raw === "") return .36;
	const value = Number(raw);
	return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : .36;
}
function EtherphoneApp() {
	const engineRef = (0, import_react.useRef)(null);
	const fieldRef = (0, import_react.useRef)(null);
	const readoutRef = (0, import_react.useRef)(null);
	const pendingPointRef = (0, import_react.useRef)(null);
	const [started, setStarted] = (0, import_react.useState)(false);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [waveform, setWaveform] = (0, import_react.useState)("sine");
	const [reverb, setReverb] = (0, import_react.useState)(.36);
	(0, import_react.useEffect)(() => {
		setWaveform(readStoredWaveform());
		setReverb(readStoredReverb());
	}, []);
	(0, import_react.useEffect)(() => {
		return () => {
			engineRef.current?.dispose();
			engineRef.current = null;
		};
	}, []);
	const begin = (0, import_react.useCallback)((event) => {
		if (engineRef.current) return;
		const engine = new EtherphoneEngine();
		engine.unlock();
		engine.setWaveform(waveform);
		engine.setReverb(reverb);
		engine.setMuted(muted);
		engineRef.current = engine;
		pendingPointRef.current = {
			clientX: event.clientX,
			clientY: event.clientY
		};
		setStarted(true);
	}, [
		muted,
		reverb,
		waveform
	]);
	const toggleMute = (0, import_react.useCallback)(() => {
		setMuted((current) => {
			const next = !current;
			engineRef.current?.setMuted(next);
			return next;
		});
	}, []);
	const onWaveform = (0, import_react.useCallback)((next) => {
		setWaveform(next);
		engineRef.current?.setWaveform(next);
		try {
			window.localStorage.setItem(STORAGE_WAVE, next);
		} catch {}
	}, []);
	const onReverb = (0, import_react.useCallback)((next) => {
		setReverb(next);
		engineRef.current?.setReverb(next);
		try {
			window.localStorage.setItem(STORAGE_REVERB, String(next));
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		const onKey = (event) => {
			if (event.code !== "Space" && event.code !== "KeyM") return;
			const target = event.target;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
			event.preventDefault();
			toggleMute();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [toggleMute]);
	(0, import_react.useEffect)(() => {
		if (!started) return;
		const point = pendingPointRef.current;
		pendingPointRef.current = null;
		if (!point) return;
		fieldRef.current?.playAtClient(point.clientX, point.clientY);
	}, [started]);
	(0, import_react.useEffect)(() => {
		const onVis = () => {
			const engine = engineRef.current;
			if (!engine) return;
			if (document.visibilityState === "visible") engine.unlock();
			else engine.setPlaying(false);
		};
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, []);
	if (!started) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-0 overflow-hidden bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StartGate, { onBegin: begin })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center justify-between gap-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg leading-none font-medium tracking-tight sm:text-xl",
							children: "Etherphone"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 hidden text-xs text-muted sm:block",
							children: "Pitch on X · volume on Y"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PitchReadout, {
						ref: readoutRef,
						className: "flex-1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MuteButton, {
						muted,
						onToggle: toggleMute
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex min-h-0 flex-1 flex-col pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-h-0 flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayField, {
						ref: fieldRef,
						engine: engineRef.current,
						muted,
						started,
						readoutRef
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "shrink-0 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.9rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Controls, {
					waveform,
					reverb,
					onWaveform,
					onReverb
				})
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EtherphoneApp, {});
}
//#endregion
export { Home as component };
