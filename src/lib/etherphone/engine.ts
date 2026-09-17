import { createReverbImpulse } from "./impulse";
import { clamp01, hzFromX, volumeFromY } from "./notes";

export type Waveform = "sine" | "triangle" | "square" | "sawtooth";

const WAVE_MIX: Record<
  Waveform,
  { sub: number; air: number; filterMul: number; filterQ: number }
> = {
  sine: { sub: 0.2, air: 0.07, filterMul: 14, filterQ: 0.4 },
  triangle: { sub: 0.16, air: 0.05, filterMul: 10, filterQ: 0.55 },
  square: { sub: 0.1, air: 0, filterMul: 5.5, filterQ: 0.7 },
  sawtooth: { sub: 0.12, air: 0, filterMul: 6.2, filterQ: 0.65 },
};

export class EtherphoneEngine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private readonly osc: OscillatorNode;
  private readonly sub: OscillatorNode;
  private readonly air: OscillatorNode;
  private readonly subGain: GainNode;
  private readonly airGain: GainNode;
  private readonly voice: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly panner: StereoPannerNode;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly delay: DelayNode;
  private readonly convolver: ConvolverNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly master: GainNode;
  private readonly muteGain: GainNode;
  private waveform: Waveform = "sine";
  private muted = false;
  private playing = false;
  private lastX = 0.5;
  private lastY = 0.55;
  private disposed = false;

  constructor() {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
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
    this.delay = this.ctx.createDelay(0.05);
    this.convolver = this.ctx.createConvolver();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.master = this.ctx.createGain();
    this.muteGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();

    this.osc.type = "sine";
    this.sub.type = "sine";
    this.air.type = "sine";
    this.osc.frequency.value = hzFromX(0.5);
    this.sub.frequency.value = hzFromX(0.5) * 0.5;
    this.air.frequency.value = hzFromX(0.5) * 2;

    this.subGain.gain.value = WAVE_MIX.sine.sub;
    this.airGain.gain.value = WAVE_MIX.sine.air;
    this.voice.gain.value = 0;
    this.filter.type = "lowpass";
    this.filter.frequency.value = 4000;
    this.filter.Q.value = WAVE_MIX.sine.filterQ;
    this.panner.pan.value = 0;
    this.dry.gain.value = 0.91;
    this.wet.gain.value = 0.22;
    this.delay.delayTime.value = 0.018;
    this.convolver.buffer = createReverbImpulse(this.ctx);
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3.2;
    this.compressor.attack.value = 0.006;
    this.compressor.release.value = 0.18;
    this.master.gain.value = 0.72;
    this.muteGain.gain.value = 1;

    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.45;

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
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setWaveform(type: Waveform) {
    this.waveform = type;
    this.osc.type = type;
    const mix = WAVE_MIX[type];
    const now = this.ctx.currentTime;
    this.subGain.gain.setTargetAtTime(mix.sub, now, 0.04);
    this.airGain.gain.setTargetAtTime(mix.air, now, 0.04);
    this.filter.Q.setTargetAtTime(mix.filterQ, now, 0.05);
    this.applyVoice(this.lastX, this.lastY, true);
  }

  setReverb(amount: number) {
    const a = clamp01(amount);
    const now = this.ctx.currentTime;
    this.wet.gain.setTargetAtTime(a * 0.64, now, 0.06);
    this.dry.gain.setTargetAtTime(1 - a * 0.28, now, 0.06);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    const now = this.ctx.currentTime;
    this.muteGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.02);
  }

  setPlaying(playing: boolean) {
    this.playing = playing;
    this.applyVoice(this.lastX, this.lastY);
  }

  /** x,y in 0..1. x = pitch (left low), y = volume (top loud). */
  move(x: number, y: number) {
    this.lastX = clamp01(x);
    this.lastY = clamp01(y);
    this.applyVoice(this.lastX, this.lastY);
  }

  private applyVoice(x: number, y: number, forceFilter = false) {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    const hz = hzFromX(x);
    const mix = WAVE_MIX[this.waveform];
    const vol = this.playing ? volumeFromY(y) * 0.42 : 0;
    const tau = this.playing ? 0.038 : 0.09;

    this.osc.frequency.setTargetAtTime(hz, now, 0.045);
    this.sub.frequency.setTargetAtTime(hz * 0.5, now, 0.045);
    this.air.frequency.setTargetAtTime(hz * 2, now, 0.045);
    this.voice.gain.setTargetAtTime(vol, now, tau);
    this.panner.pan.setTargetAtTime((x * 2 - 1) * 0.48, now, 0.06);

    if (this.playing || forceFilter) {
      const cutoff = Math.min(14000, Math.max(280, hz * mix.filterMul));
      this.filter.frequency.setTargetAtTime(cutoff, now, 0.06);
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
    } catch {
      /* already stopped */
    }
    void this.ctx.close();
  }
}
