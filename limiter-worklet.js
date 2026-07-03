// True lookahead brick-wall limiter, running off the main thread via AudioWorklet.
// Unlike DynamicsCompressorNode (a soft compressor with no output guarantee), this:
//  - detects peaks on the live signal but applies gain to a delayed copy (lookahead),
//    so the gain has already ramped down before the loud transient reaches the output
//    instead of reacting after the fact;
//  - stereo-links the gain reduction (driven by the loudest channel) to avoid image shift;
//  - hard-clamps the final output to `ceiling` regardless of envelope lag, guaranteeing
//    no sample ever exceeds it — the actual "brick wall" a real limiter promises.
//
// STYLE_PRESETS parameterize a family of limiting characters (Transparent/Dynamic/
// Punchy/Allround/Modern/Bus/Safe), each a tuple of:
//  - kneeShape: knee curve exponent. The knee region uses
//      halfKnee * (x/knee)^kneeShape * (1 - 1/ratio),  x = over + halfKnee
//    which — unlike a naive Math.pow(x,p)/(p*knee^(p-1)) generalization — is
//    engineered to always equal the original quadratic formula's value at both
//    knee boundaries (x=0 and x=knee) for ANY kneeShape, and reduces to exactly
//    today's (x*x)/(2*knee) formula at kneeShape=2. This is what makes Allround
//    (kneeShape 2, detectorMix 1, releaseFastWeight 0) byte-identical to the
//    pre-style-system behavior — required, since this limiter already ships.
//  - detectorMix: blend between the instantaneous peak and a cheap leaky-RMS
//    estimate (1.0 = pure peak, today's exact detector).
//  - attackMult: multiplier on the user's attack-time slider.
//  - releaseFastWeight: how much a fast (0.15x user release time) release
//    segment blends into the release coefficient (0 = pure user-set release,
//    today's exact behavior) — gives Punchy/Dynamic's snappier recovery.
const STYLE_NAMES = ['Transparent', 'Dynamic', 'Punchy', 'Allround', 'Modern', 'Bus', 'Safe'];
const STYLE_PRESETS = [
  { kneeShape: 3.0, detectorMix: 0.4, attackMult: 1.0, releaseFastWeight: 0.3 }, // Transparent
  { kneeShape: 2.5, detectorMix: 0.5, attackMult: 1.0, releaseFastWeight: 0.6 }, // Dynamic
  { kneeShape: 2.0, detectorMix: 0.6, attackMult: 1.2, releaseFastWeight: 0.7 }, // Punchy
  { kneeShape: 2.0, detectorMix: 1.0, attackMult: 1.0, releaseFastWeight: 0.0 }, // Allround (= today exactly)
  { kneeShape: 1.6, detectorMix: 0.85, attackMult: 0.8, releaseFastWeight: 0.2 }, // Modern
  { kneeShape: 1.3, detectorMix: 0.95, attackMult: 1.0, releaseFastWeight: 0.1 }, // Bus
  { kneeShape: 1.0, detectorMix: 1.0, attackMult: 1.0, releaseFastWeight: 0.0 }, // Safe
];
const FAST_RELEASE_RATIO = 0.15; // fixed fast-segment time vs. user release, blended per-style by releaseFastWeight

// Adaptive/auto release: maps real-time crest factor (peak/RMS in dB) to a
// release-time multiplier — dense/low-crest material releases slower (avoids
// pumping on material that's loud throughout), percussive/high-crest material
// releases faster (recovers between hits). Supersedes the style's fixed
// releaseFastWeight blend when enabled (autoRelease=0 uses the style blend).
const CREST_LOW_DB = 4, CREST_HIGH_DB = 18;
const RELEASE_MULT_AT_LOW_CREST = 1.75; // slower
const RELEASE_MULT_AT_HIGH_CREST = 0.5; // faster

// True Peak: a plain per-sample peak detector misses inter-sample overs (the
// analog waveform reconstructed by a DAC can peak *between* two samples that
// individually look fine). This reconstructs the waveform at the user's
// selected oversampling factor (2x/4x/16x) with a real polyphase FIR bank
// (windowed-sinc, one filter per sub-sample phase) — not a curve-fit
// approximation — reading samples already sitting in the existing lookahead
// delay ring buffer (no extra buffer needed). Still not the analog-matched
// polyphase filters a commercial true-peak meter certifies against — those
// are proprietary — but this is real band-limited reconstruction.
const TP_FIR_HALF_TAPS = 4; // 8-tap kernel: 4 samples each side of the interpolation instant
function sinc(x) { return x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); }
function blackman(n, N) {
  return 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1));
}
// Builds L-1 filters (one per fractional phase p/L, p=1..L-1) of 2*TP_FIR_HALF_TAPS
// taps each, reconstructing the signal at that phase between window samples
// index (TP_FIR_HALF_TAPS-1) and (TP_FIR_HALF_TAPS) of an 8-sample window.
function buildPolyphaseFIR(L) {
  const N = TP_FIR_HALF_TAPS * 2;
  const phases = [];
  for (let p = 1; p < L; p++) {
    const frac = p / L;
    const taps = new Float64Array(N);
    let sum = 0;
    for (let k = 0; k < N; k++) {
      const m = k - (TP_FIR_HALF_TAPS - 1) - frac;
      const w = blackman(k, N);
      const c = sinc(m) * w;
      taps[k] = c;
      sum += c;
    }
    for (let k = 0; k < N; k++) taps[k] /= sum; // unity DC gain
    phases.push(taps);
  }
  return phases;
}
const OVERSAMPLE_FACTORS = [2, 4, 8, 16];
const POLYPHASE_BANKS = OVERSAMPLE_FACTORS.map(buildPolyphaseFIR);
// Reads the 8-sample window ending at ringIdx (inclusive) from a ring buffer
// and evaluates every phase of the given bank, returning the max abs value
// found across all phases plus the two samples straddling the interpolation
// gap themselves.
function polyphaseMaxAbs(buf, bufLen, ringIdx, bank) {
  const N = TP_FIR_HALF_TAPS * 2;
  const win = polyphaseMaxAbs._win || (polyphaseMaxAbs._win = new Float64Array(N));
  for (let k = 0; k < N; k++) {
    win[k] = buf[(ringIdx - (N - 1) + k + bufLen) % bufLen];
  }
  let maxAbs = Math.max(Math.abs(win[TP_FIR_HALF_TAPS - 1]), Math.abs(win[TP_FIR_HALF_TAPS]));
  for (const taps of bank) {
    let acc = 0;
    for (let k = 0; k < N; k++) acc += taps[k] * win[k];
    const a = Math.abs(acc);
    if (a > maxAbs) maxAbs = a;
  }
  return maxAbs;
}

// ITU-R BS.1770-4 K-weighting: two cascaded biquads (a ~+4dB high-shelf around
// 1.5-1.7kHz, then a ~38Hz high-pass). The commonly-published 48kHz-only
// coefficients aren't safe here since AudioContext.sampleRate varies by
// device — instead we re-derive them via the standard RBJ bilinear-transform
// cookbook formulas from the sample-rate-independent analog prototype
// (the same shelf/highpass center-frequency + Q values commonly cited for
// reverse-engineering the BS.1770 filters), so the filter is at least
// re-derived correctly for whatever rate this worklet actually runs at.
// Verified: the highpass stage reproduces the published 48kHz reference
// coefficients almost exactly (a1/a2 identical, numerator differs by a
// ~0.5% pure gain-normalization factor — negligible). The shelf stage's
// RBJ-cookbook rendering does NOT bit-match the published 48kHz reference
// coefficients (reference LUFS implementations likely use a slightly
// different shelf topology than the generic RBJ Q-parametrized cookbook)
// — the overall K-weighting curve shape (highpass below ~38Hz, boost
// around 1.5-2kHz) is still correct, but do not treat readings from this
// filter as bit-exact against a reference LUFS meter; treat them as
// "plausible, correctly-shaped, ballpark-accurate" only.
function designBiquadHighShelf(f0, gainDb, Q, fs) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const cosw0 = Math.cos(w0), sinw0 = Math.sin(w0);
  const alpha = sinw0 / 2 * Math.sqrt((A + 1 / A) * (1 / Q - 1) + 2);
  const sqrtA = Math.sqrt(A);
  const b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * sqrtA * alpha);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
  const b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * sqrtA * alpha);
  const a0 = (A + 1) - (A - 1) * cosw0 + 2 * sqrtA * alpha;
  const a1 = 2 * ((A - 1) - (A + 1) * cosw0);
  const a2 = (A + 1) - (A - 1) * cosw0 - 2 * sqrtA * alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function designBiquadHighPass(f0, Q, fs) {
  const w0 = 2 * Math.PI * f0 / fs;
  const cosw0 = Math.cos(w0), sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Q);
  const b0 = (1 + cosw0) / 2;
  const b1 = -(1 + cosw0);
  const b2 = (1 + cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function designKWeighting(fs) {
  return {
    stage1: designBiquadHighShelf(1681.9744509555319, 3.99984385397, 0.7071752369554196, fs),
    stage2: designBiquadHighPass(38.13547087602444, 0.5003270373238773, fs),
  };
}

const LUFS_ABS_GATE = -70;
const LUFS_REL_GATE_INTEGRATED = -10;
const LRA_REL_GATE = -20;
function meanZ(list) { return list.reduce((a, b) => a + b, 0) / list.length; }
function loudnessOf(z) { return -0.691 + 10 * Math.log10(Math.max(z, 1e-12)); }
// Two-pass BS.1770 gating, done on linear mean-square (z) values, not on
// already-converted dB loudness — averaging in the power domain then
// converting once is what the spec requires (averaging dB values directly
// is not equivalent and would under/over-weight louder/quieter blocks).
function gatedIntegrated(zHistory) {
  if (!zHistory.length) return null;
  const zAbsThresh = Math.pow(10, (LUFS_ABS_GATE + 0.691) / 10);
  const stage1 = zHistory.filter(z => z > zAbsThresh);
  if (!stage1.length) return null;
  const loud1 = loudnessOf(meanZ(stage1));
  const zRelThresh = Math.pow(10, (loud1 + LUFS_REL_GATE_INTEGRATED + 0.691) / 10);
  const stage2 = stage1.filter(z => z > zRelThresh);
  return stage2.length ? loudnessOf(meanZ(stage2)) : loud1;
}
function gatedLRA(zHistory) {
  if (!zHistory.length) return null;
  const zAbsThresh = Math.pow(10, (LUFS_ABS_GATE + 0.691) / 10);
  const stage1 = zHistory.filter(z => z > zAbsThresh);
  if (!stage1.length) return null;
  const loud1 = loudnessOf(meanZ(stage1));
  const zRelThresh = Math.pow(10, (loud1 + LRA_REL_GATE + 0.691) / 10);
  const stage2 = stage1.filter(z => z > zRelThresh);
  if (stage2.length < 2) return 0;
  const loudnesses = stage2.map(loudnessOf).sort((a, b) => a - b);
  const pct = p => {
    const idx = p * (loudnesses.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? loudnesses[lo] : loudnesses[lo] + (loudnesses[hi] - loudnesses[lo]) * (idx - lo);
  };
  return pct(0.95) - pct(0.10);
}

class VmuLimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -3, minValue: -60, maxValue: 0, automationRate: 'k-rate' },
      { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20, automationRate: 'k-rate' },
      { name: 'attack', defaultValue: 3, minValue: 0, maxValue: 100, automationRate: 'k-rate' }, // ms
      { name: 'release', defaultValue: 250, minValue: 0, maxValue: 1000, automationRate: 'k-rate' }, // ms
      { name: 'knee', defaultValue: 0, minValue: 0, maxValue: 40, automationRate: 'k-rate' }, // dB
      { name: 'ceiling', defaultValue: -0.3, minValue: -20, maxValue: 0, automationRate: 'k-rate' }, // dB
      // Right-channel ceiling override — only honored in Unlinked mode
      // (processingMode===1); `ceiling` above always remains the left/shared
      // ceiling. Defaults equal to `ceiling`'s default so leaving it untouched
      // is a no-op.
      { name: 'ceilingR', defaultValue: -0.3, minValue: -20, maxValue: 0, automationRate: 'k-rate' }, // dB
      { name: 'inputGain', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' }, // dB
      { name: 'outputGain', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' }, // dB
      { name: 'enabled', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'style', defaultValue: 3, minValue: 0, maxValue: 6, automationRate: 'k-rate' }, // index into STYLE_PRESETS, default Allround
      { name: 'autoRelease', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'truePeakMode', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // Index into OVERSAMPLE_FACTORS ([2,4,8,16]) — which polyphase FIR bank
      // true-peak detection uses. Only consulted when truePeakMode is on.
      { name: 'oversampling', defaultValue: 1, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      // Gates the K-weighting/LUFS accumulation entirely — content.js only
      // sets this to 1 while the Метринг tab is actually the open tab, so
      // users who never look at it pay zero extra per-sample cost.
      { name: 'meteringActive', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'autoGain', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // 0 = Stereo Linked (default, today's exact behavior), 1 = Unlinked
      // (independent per-channel gain), 2 = Mid/Side (independent gain on
      // the encoded mid/side signal). Silently falls back to 0 unless
      // channelCount === 2.
      { name: 'processingMode', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this._lookaheadSamples = Math.round(sampleRate * 0.005); // 5ms
    this._bufLen = this._lookaheadSamples + 32; // small headroom
    this._delayBuf = null;
    this._writeIdx = 0;
    this._envDb = 0; // current smoothed gain reduction, in dB (0 = no reduction)
    this._rmsSq = 0; // leaky-integrator mean-square estimate, shared/stereo-linked like the peak detector
    this._rmsCoeff = 1 - Math.exp(-1 / (sampleRate * 0.002)); // ~2ms leaky-RMS window, fixed internal constant
    this._reportCounter = 0;
    // Max-since-last-report accumulators. Must persist across process() calls
    // (each call only covers one ~128-frame render quantum, but a report is
    // only sent every 8 calls) — previously declared as locals inside
    // process(), which reset them to 0 every single call and silently
    // discarded 7 out of every 8 blocks' worth of peak data, so the reported
    // value only ever reflected the last ~3ms before a report instead of the
    // full ~21ms since the previous one. That's what made the meters read as
    // randomly jumping between reports instead of tracking the real peak.
    this._maxReductionSinceReport = 0;
    this._maxTruePeakSinceReport = 0;
    this._maxRawPeakSinceReport = 0;

    // Auto Gain (Phase 4): a cheap approximation of loudness-matched bypass
    // A/B — rather than an independent dual-path LUFS comparison, track a
    // slow (~1.5s) running average of the envelope's own applied reduction
    // and feed back the negative of it as makeup gain, so toggling `enabled`
    // doesn't just make the track louder (which biases any A/B towards
    // "on" regardless of whether the limiter's character is actually
    // preferred). This is an approximation, not a literal loudness match.
    this._autoGainCoeff = 1 - Math.exp(-1 / (sampleRate * 1.5));
    this._autoGainTrimDb = 0;

    // Unlinked/Mid-Side (Phase 5) — per-lane copies of the envelope/RMS/
    // auto-gain state above, used only when processingMode != 0 (and only
    // meaningful for exactly 2 channels; anything else silently falls back
    // to Stereo Linked). Kept as a completely separate code path from the
    // Stereo Linked loop below rather than a unified generalization, so the
    // default (already-shipped) behavior can never regress from this change.
    this._envDbLane = new Float64Array(2);
    this._rmsSqLane = new Float64Array(2);
    this._autoGainTrimDbLane = new Float64Array(2);

    // LUFS/LRA metering (Phase 3) — sampleRate is fixed for the worklet's
    // lifetime, so the K-weighting coefficients are designed once and cached.
    this._kw = designKWeighting(sampleRate);
    this._kw1x1 = null; this._kw1x2 = null; this._kw1y1 = null; this._kw1y2 = null; // stage 1 (shelf) state, per channel
    this._kw2x1 = null; this._kw2x2 = null; this._kw2y1 = null; this._kw2y2 = null; // stage 2 (highpass) state, per channel
    this._samplesPerHop = Math.round(sampleRate * 0.1); // 100ms hop
    this._hopSumSq = 0;
    this._hopSampleCount = 0;
    this._hopZHistory = []; // one linear mean-square value per 100ms hop, whole-track history
    this._blockZHistory = []; // 400ms-block z (avg of last 4 hops), one per hop — feeds Integrated LUFS
    this._shortTermZHistory = []; // 3s z (avg of last 30 hops), one per hop — feeds LRA
    this._momentaryLufs = null;
    this._shortTermLufs = null;
    this._integratedLufs = null;
    this._lra = null;
    this._lufsRecomputeCounter = 0;

    this.port.onmessage = e => {
      if (e.data && e.data.type === 'resetLufs') {
        this._hopZHistory.length = 0;
        this._blockZHistory.length = 0;
        this._shortTermZHistory.length = 0;
        this._hopSumSq = 0;
        this._hopSampleCount = 0;
        this._momentaryLufs = null;
        this._shortTermLufs = null;
        this._integratedLufs = null;
        this._lra = null;
      }
    };
  }

  _ensureBuffers(channelCount) {
    if (this._delayBuf && this._delayBuf.length === channelCount) return;
    this._delayBuf = Array.from({ length: channelCount }, () => new Float32Array(this._bufLen));
    this._writeIdx = 0;
    this._kw1x1 = new Float64Array(channelCount); this._kw1x2 = new Float64Array(channelCount);
    this._kw1y1 = new Float64Array(channelCount); this._kw1y2 = new Float64Array(channelCount);
    this._kw2x1 = new Float64Array(channelCount); this._kw2x2 = new Float64Array(channelCount);
    this._kw2y1 = new Float64Array(channelCount); this._kw2y2 = new Float64Array(channelCount);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const channelCount = Math.min(input.length, output.length);
    this._ensureBuffers(channelCount);

    const threshold = parameters.threshold[0];
    const ratio = Math.max(1, parameters.ratio[0]);
    const attackMs = parameters.attack[0];
    const releaseMs = parameters.release[0];
    const knee = Math.max(0, parameters.knee[0]);
    const ceilingDb = parameters.ceiling[0];
    const ceilingRDb = parameters.ceilingR[0];
    const inputGainDb = parameters.inputGain[0];
    const outputGainDb = parameters.outputGain[0];
    const enabled = parameters.enabled[0] >= 0.5;
    const styleIdx = Math.max(0, Math.min(STYLE_PRESETS.length - 1, Math.round(parameters.style[0])));
    const style = STYLE_PRESETS[styleIdx];
    const autoRelease = parameters.autoRelease[0] >= 0.5;
    const truePeakMode = parameters.truePeakMode[0] >= 0.5;
    const oversampleIdx = Math.max(0, Math.min(OVERSAMPLE_FACTORS.length - 1, Math.round(parameters.oversampling[0])));
    const polyphaseBank = POLYPHASE_BANKS[oversampleIdx];
    const meteringActive = parameters.meteringActive[0] >= 0.5;
    const autoGain = parameters.autoGain[0] >= 0.5;
    const processingMode = channelCount === 2 ? Math.max(0, Math.min(2, Math.round(parameters.processingMode[0]))) : 0;

    const inputGainLin = enabled ? Math.pow(10, inputGainDb / 20) : 1;
    const outputGainLin = enabled ? Math.pow(10, outputGainDb / 20) : 1;
    const ceilingLin = Math.pow(10, ceilingDb / 20);
    // Only meaningfully different from ceilingLin in Unlinked mode; the
    // Stereo Linked and M/S paths never read this.
    const ceilingRLin = Math.pow(10, ceilingRDb / 20);
    const halfKnee = knee / 2;

    // One-pole smoothing coefficients from attack/release time constants.
    // attackMult/releaseFastWeight are style character knobs layered on top of
    // the user's own attack/release sliders, not a replacement for them.
    const effectiveAttackMs = attackMs * style.attackMult;
    const attackCoeff = effectiveAttackMs > 0 ? 1 - Math.exp(-1 / (sampleRate * (effectiveAttackMs / 1000))) : 1;
    const releaseCoeffAt = mult => {
      const ms = releaseMs * mult;
      return ms > 0 ? 1 - Math.exp(-1 / (sampleRate * (ms / 1000))) : 1;
    };
    const releaseCoeffSlow = releaseCoeffAt(1.0);
    // Style-based fixed fast/slow release blend (used when autoRelease is off).
    const releaseCoeffStyled = releaseCoeffSlow + (releaseCoeffAt(FAST_RELEASE_RATIO) - releaseCoeffSlow) * style.releaseFastWeight;
    // Auto-release's two crest-factor extremes, precomputed once per block —
    // per-sample cost is just interpolating between these two, never a fresh
    // Math.exp per sample.
    const releaseCoeffAutoLow = releaseCoeffAt(RELEASE_MULT_AT_LOW_CREST);
    const releaseCoeffAutoHigh = releaseCoeffAt(RELEASE_MULT_AT_HIGH_CREST);

    const frames = input[0].length;
    const buf = this._delayBuf;
    const delaySamples = this._lookaheadSamples;
    const bufLen = this._bufLen;

    for (let n = 0; n < frames; n++) {
      // LUFS/LRA metering — reads input[ch][n] directly, independent of
      // processingMode/the ring buffer's contents, so it's shared verbatim
      // between the Stereo Linked and Unlinked/M-S paths below. K-weights
      // the same pre-limiting signal already fed to the detector (not the
      // limited output; matches Phase 4's need for a pre-processing loudness
      // reference). Fully skipped when meteringActive is off.
      if (meteringActive) {
        const kw1 = this._kw.stage1, kw2 = this._kw.stage2;
        let sumSqK = 0;
        for (let ch = 0; ch < channelCount; ch++) {
          const x = input[ch][n] * inputGainLin;
          const y1 = kw1.b0 * x + kw1.b1 * this._kw1x1[ch] + kw1.b2 * this._kw1x2[ch]
            - kw1.a1 * this._kw1y1[ch] - kw1.a2 * this._kw1y2[ch];
          this._kw1x2[ch] = this._kw1x1[ch]; this._kw1x1[ch] = x;
          this._kw1y2[ch] = this._kw1y1[ch]; this._kw1y1[ch] = y1;
          const y2 = kw2.b0 * y1 + kw2.b1 * this._kw2x1[ch] + kw2.b2 * this._kw2x2[ch]
            - kw2.a1 * this._kw2y1[ch] - kw2.a2 * this._kw2y2[ch];
          this._kw2x2[ch] = this._kw2x1[ch]; this._kw2x1[ch] = y1;
          this._kw2y2[ch] = this._kw2y1[ch]; this._kw2y1[ch] = y2;
          sumSqK += y2 * y2;
        }
        this._hopSumSq += sumSqK;
        this._hopSampleCount++;
        if (this._hopSampleCount >= this._samplesPerHop) {
          const hopZ = this._hopSumSq / this._hopSampleCount;
          this._hopZHistory.push(hopZ);
          this._hopSumSq = 0;
          this._hopSampleCount = 0;

          const hist = this._hopZHistory;
          if (hist.length >= 4) {
            const last4 = hist.slice(-4);
            const blockZ = meanZ(last4);
            this._blockZHistory.push(blockZ);
            this._momentaryLufs = loudnessOf(blockZ);
          }
          if (hist.length >= 30) {
            const last30 = hist.slice(-30);
            const stZ = meanZ(last30);
            this._shortTermZHistory.push(stZ);
            this._shortTermLufs = loudnessOf(stZ);
          }
          // Two-pass gating needs the whole accumulated history and isn't
          // cheap to redo every 100ms hop — throttle to ~1x/sec.
          if (++this._lufsRecomputeCounter >= 10) {
            this._lufsRecomputeCounter = 0;
            this._integratedLufs = gatedIntegrated(this._blockZHistory);
            this._lra = gatedLRA(this._shortTermZHistory);
          }
        }
      }

      if (processingMode === 0) {
        // ── Stereo Linked (default) — byte-identical to the pre-Phase-5 code. ──
        let rawPeak = 0;
        for (let ch = 0; ch < channelCount; ch++) {
          const s = input[ch][n] * inputGainLin;
          buf[ch][this._writeIdx] = s;
          const a = Math.abs(s);
          if (a > rawPeak) rawPeak = a;
        }
        if (rawPeak > this._maxRawPeakSinceReport) this._maxRawPeakSinceReport = rawPeak;

        let truePeakEstimate = 0;
        if (truePeakMode) {
          // Window ends at writeIdx (the sample just written above), so the
          // interpolation gap sits between offsets -4 and -3 relative to
          // writeIdx — 3 samples of lag, all already-written data, no extra
          // lookahead needed beyond what polyphaseMaxAbs's window requires.
          for (let ch = 0; ch < channelCount; ch++) {
            const v = polyphaseMaxAbs(buf[ch], bufLen, this._writeIdx, polyphaseBank);
            if (v > truePeakEstimate) truePeakEstimate = v;
          }
          if (truePeakEstimate > this._maxTruePeakSinceReport) this._maxTruePeakSinceReport = truePeakEstimate;
        }
        const effectivePeak = truePeakMode ? Math.max(rawPeak, truePeakEstimate) : rawPeak;

        this._rmsSq += (rawPeak * rawPeak - this._rmsSq) * this._rmsCoeff;

        let desiredReductionDb = 0;
        if (enabled) {
          const detectedLevel = style.detectorMix * effectivePeak + (1 - style.detectorMix) * Math.sqrt(this._rmsSq);
          const peakDb = 20 * Math.log10(Math.max(detectedLevel, 1e-8));
          const over = peakDb - threshold;
          if (knee > 0 && over > -halfKnee && over < halfKnee) {
            const x = over + halfKnee;
            desiredReductionDb = halfKnee * Math.pow(x / knee, style.kneeShape) * (1 - 1 / ratio);
          } else if (over >= halfKnee) {
            desiredReductionDb = over * (1 - 1 / ratio);
          }
        }

        let releaseCoeff = releaseCoeffStyled;
        if (autoRelease) {
          const crestDb = 20 * Math.log10(Math.max(rawPeak, 1e-8)) - 10 * Math.log10(Math.max(this._rmsSq, 1e-8));
          let t = (crestDb - CREST_LOW_DB) / (CREST_HIGH_DB - CREST_LOW_DB);
          t = Math.max(0, Math.min(1, t));
          releaseCoeff = releaseCoeffAutoLow + (releaseCoeffAutoHigh - releaseCoeffAutoLow) * t;
        }

        this._envDb += (desiredReductionDb - this._envDb) * (desiredReductionDb > this._envDb ? attackCoeff : releaseCoeff);
        if (this._envDb > this._maxReductionSinceReport) this._maxReductionSinceReport = this._envDb;

        if (autoGain) {
          this._autoGainTrimDb += (this._envDb - this._autoGainTrimDb) * this._autoGainCoeff;
        }
        const autoGainLin = autoGain ? Math.pow(10, this._autoGainTrimDb / 20) : 1;

        const gainLin = Math.pow(10, -this._envDb / 20) * outputGainLin * autoGainLin;
        const readIdx = (this._writeIdx - delaySamples + bufLen) % bufLen;

        for (let ch = 0; ch < channelCount; ch++) {
          let s = buf[ch][readIdx] * gainLin;
          if (enabled) {
            if (s > ceilingLin) s = ceilingLin;
            else if (s < -ceilingLin) s = -ceilingLin;
          }
          output[ch][n] = s;
        }

        this._writeIdx = (this._writeIdx + 1) % bufLen;
      } else {
        // ── Unlinked (1) / Mid-Side (2) — independent gain per lane. ──
        // Note: True Peak detection (if also enabled) reads this same ring
        // buffer, so in M/S mode it estimates inter-sample peaks of the
        // encoded mid/side signal rather than the decoded L/R output — a
        // known, documented imprecision for that specific combination, not
        // fixed here to keep this already-invasive phase bounded in scope.
        const ch0in = input[0][n] * inputGainLin;
        const ch1in = input[1][n] * inputGainLin;
        let lane0in, lane1in;
        if (processingMode === 2) {
          lane0in = (ch0in + ch1in) * 0.5; // mid
          lane1in = (ch0in - ch1in) * 0.5; // side
        } else {
          lane0in = ch0in; lane1in = ch1in; // unlinked: raw L/R, no encoding
        }
        buf[0][this._writeIdx] = lane0in;
        buf[1][this._writeIdx] = lane1in;

        const rawPeakLanes = Math.max(Math.abs(lane0in), Math.abs(lane1in));
        if (rawPeakLanes > this._maxRawPeakSinceReport) this._maxRawPeakSinceReport = rawPeakLanes;

        let truePeakEstimate = 0;
        if (truePeakMode) {
          for (let ch = 0; ch < 2; ch++) {
            const v = polyphaseMaxAbs(buf[ch], bufLen, this._writeIdx, polyphaseBank);
            if (v > truePeakEstimate) truePeakEstimate = v;
          }
          if (truePeakEstimate > this._maxTruePeakSinceReport) this._maxTruePeakSinceReport = truePeakEstimate;
        }

        const laneIn = [lane0in, lane1in];
        const laneGains = [1, 1];
        let maxLaneReduction = 0;
        for (let lane = 0; lane < 2; lane++) {
          const rawPeakLane = Math.abs(laneIn[lane]);
          this._rmsSqLane[lane] += (rawPeakLane * rawPeakLane - this._rmsSqLane[lane]) * this._rmsCoeff;
          const effectivePeakLane = truePeakMode ? Math.max(rawPeakLane, truePeakEstimate) : rawPeakLane;

          let desiredReductionDb = 0;
          if (enabled) {
            const detectedLevel = style.detectorMix * effectivePeakLane + (1 - style.detectorMix) * Math.sqrt(this._rmsSqLane[lane]);
            const peakDb = 20 * Math.log10(Math.max(detectedLevel, 1e-8));
            const over = peakDb - threshold;
            if (knee > 0 && over > -halfKnee && over < halfKnee) {
              const x = over + halfKnee;
              desiredReductionDb = halfKnee * Math.pow(x / knee, style.kneeShape) * (1 - 1 / ratio);
            } else if (over >= halfKnee) {
              desiredReductionDb = over * (1 - 1 / ratio);
            }
          }

          let releaseCoeff = releaseCoeffStyled;
          if (autoRelease) {
            const crestDb = 20 * Math.log10(Math.max(rawPeakLane, 1e-8)) - 10 * Math.log10(Math.max(this._rmsSqLane[lane], 1e-8));
            let t = (crestDb - CREST_LOW_DB) / (CREST_HIGH_DB - CREST_LOW_DB);
            t = Math.max(0, Math.min(1, t));
            releaseCoeff = releaseCoeffAutoLow + (releaseCoeffAutoHigh - releaseCoeffAutoLow) * t;
          }

          const envDbLane = this._envDbLane[lane] + (desiredReductionDb - this._envDbLane[lane]) * (desiredReductionDb > this._envDbLane[lane] ? attackCoeff : releaseCoeff);
          this._envDbLane[lane] = envDbLane;
          if (envDbLane > maxLaneReduction) maxLaneReduction = envDbLane;

          if (autoGain) {
            this._autoGainTrimDbLane[lane] += (envDbLane - this._autoGainTrimDbLane[lane]) * this._autoGainCoeff;
          }
          const autoGainLaneLin = autoGain ? Math.pow(10, this._autoGainTrimDbLane[lane] / 20) : 1;
          laneGains[lane] = Math.pow(10, -envDbLane / 20) * outputGainLin * autoGainLaneLin;
        }
        if (maxLaneReduction > this._maxReductionSinceReport) this._maxReductionSinceReport = maxLaneReduction;

        const readIdx = (this._writeIdx - delaySamples + bufLen) % bufLen;
        const lane0out = buf[0][readIdx] * laneGains[0];
        const lane1out = buf[1][readIdx] * laneGains[1];
        let outL, outR;
        if (processingMode === 2) {
          outL = lane0out + lane1out; // M/S decode
          outR = lane0out - lane1out;
        } else {
          outL = lane0out; outR = lane1out;
        }
        if (enabled) {
          // Separate right-channel ceiling only makes sense pre-decode in
          // Unlinked mode, where lane0/lane1 already *are* L/R; in M/S mode
          // outL/outR are a sum/difference of the encoded lanes, so a
          // per-lane ceiling wouldn't map to a per-ear ceiling — both use
          // the shared `ceiling` there.
          const rCeil = processingMode === 1 ? ceilingRLin : ceilingLin;
          if (outL > ceilingLin) outL = ceilingLin; else if (outL < -ceilingLin) outL = -ceilingLin;
          if (outR > rCeil) outR = rCeil; else if (outR < -rCeil) outR = -rCeil;
        }
        output[0][n] = outL;
        output[1][n] = outR;

        this._writeIdx = (this._writeIdx + 1) % bufLen;
      }
    }

    if (++this._reportCounter >= 8) {
      this._reportCounter = 0;
      const truePeakDb = truePeakMode ? 20 * Math.log10(Math.max(this._maxTruePeakSinceReport, 1e-8)) : null;
      this.port.postMessage({
        type: 'meter',
        reductionDb: this._maxReductionSinceReport,
        inputPeakDb: 20 * Math.log10(Math.max(this._maxRawPeakSinceReport, 1e-8)),
        truePeakDb,
        momentaryLufs: meteringActive ? this._momentaryLufs : null,
        shortTermLufs: meteringActive ? this._shortTermLufs : null,
        integratedLufs: meteringActive ? this._integratedLufs : null,
        lra: meteringActive ? this._lra : null,
        autoGainTrimDb: autoGain ? this._autoGainTrimDb : null,
      });
      // Only reset here, once the accumulated max has actually been sent —
      // these must survive across the 8 process() calls between reports.
      this._maxReductionSinceReport = 0;
      this._maxTruePeakSinceReport = 0;
      this._maxRawPeakSinceReport = 0;
    }

    return true;
  }
}
registerProcessor('vmu-limiter', VmuLimiterProcessor);
