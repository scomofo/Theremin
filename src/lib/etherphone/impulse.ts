/** Stereo plate-ish impulse: short bright onset, exponential noise tail. */
export function createReverbImpulse(
  ctx: AudioContext,
  duration = 1.85,
  decay = 2.6,
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * duration));
  const impulse = ctx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = (1 - t) ** decay;
      // Decorrelate L/R; roll off a little low rumble with a rising envelope.
      const noise = Math.random() * 2 - 1;
      const bright = 0.35 + 0.65 * Math.min(1, i / (rate * 0.012));
      data[i] = noise * env * bright;
    }
  }

  return impulse;
}
