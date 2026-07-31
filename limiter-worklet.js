// Three-stage audio FX chain in a single AudioWorklet node, running off the
// main thread: 10-band peaking EQ → program compressor → true lookahead
// brick-wall limiter, in any of six stage orders (`chainOrder` param).
//
// Historically this node was "compressor with a hard clamp pretending to be a
// limiter": one envelope driven by threshold/ratio, and the ceiling enforced
// only by clipping whatever the envelope missed. Split apart because that
// design (a) hard-clipped audibly whenever the compressor was set slow/gentle,
// (b) fused the two stages so nothing could ever be inserted between or
// reordered around them. Now:
//
//  - EQ: RBJ-cookbook peaking biquads (the same formula BiquadFilterNode is
//    specced to implement, Q=1.41) — moved inside the worklet from native
//    BiquadFilterNodes so the chain order can put the EQ anywhere, including
//    between the two dynamics stages. Band gain AND center frequency (each
//    freely draggable on content.js's EQ graph) smooth over ~40ms before
//    coefficient redesign, so drags don't zipper.
//  - Compressor: the original envelope compressor unchanged in character —
//    threshold/ratio/knee/styles/auto-release/auto-gain, Linked/Unlinked/M-S.
//    Detection and gain application now happen on the same sample (the 5ms
//    lookahead was moved wholesale into the limiter stage, where it earns its
//    latency) and the compressor has no ceiling duty at all.
//  - Limiter: a real brick-wall stage with its own envelope — infinite-ratio
//    detection against `ceiling`, attack time constant hard-tied to the 5ms
//    lookahead (τ = lookahead·0.25, so the envelope is ~98% converged by the
//    time the transient exits the delay line — no user attack knob to
//    mis-set), release from `limRelease`. With truePeakMode on, the detector
//    runs on the polyphase-FIR inter-sample peak estimate, so the envelope
//    targets true peaks rather than sample peaks. The envelope also
//    pre-compensates for `outputGain` applied after the chain, so "ceiling"
//    keeps meaning the level at the node's output. A final sample-domain
//    safety clamp still guarantees the hard ceiling — but it now only trims
//    the residual fractions of a dB the envelope misses, instead of doing all
//    the limiting.
//
// STYLE_PRESETS parameterize a family of compression characters (Transparent/
// Dynamic/Punchy/Allround/Modern/Bus/Safe), each a tuple of:
//  - kneeShape: knee curve exponent. The knee region uses
//      halfKnee * (x/knee)^kneeShape * (1 - 1/ratio),  x = over + halfKnee
//    which is engineered to always equal the original quadratic formula's
//    value at both knee boundaries (x=0 and x=knee) for ANY kneeShape, and
//    reduces to exactly the (x*x)/(2*knee) formula at kneeShape=2.
//  - detectorMix: blend between the instantaneous peak and a cheap leaky-RMS
//    estimate (1.0 = pure peak).
//  - attackMult: multiplier on the user's attack-time slider.
//  - releaseFastWeight: how much a fast (0.15x user release time) release
//    segment blends into the release coefficient (0 = pure user-set release)
//    — gives Punchy/Dynamic's snappier recovery.
const STYLE_NAMES = ['Transparent', 'Dynamic', 'Punchy', 'Allround', 'Modern', 'Bus', 'Safe'];
const STYLE_PRESETS = [
  { kneeShape: 3.0, detectorMix: 0.4, attackMult: 1.0, releaseFastWeight: 0.3 }, // Transparent
  { kneeShape: 2.5, detectorMix: 0.5, attackMult: 1.0, releaseFastWeight: 0.6 }, // Dynamic
  { kneeShape: 2.0, detectorMix: 0.6, attackMult: 1.2, releaseFastWeight: 0.7 }, // Punchy
  { kneeShape: 2.0, detectorMix: 1.0, attackMult: 1.0, releaseFastWeight: 0.0 }, // Allround
  { kneeShape: 1.6, detectorMix: 0.85, attackMult: 0.8, releaseFastWeight: 0.2 }, // Modern
  { kneeShape: 1.3, detectorMix: 0.95, attackMult: 1.0, releaseFastWeight: 0.1 }, // Bus
  { kneeShape: 1.0, detectorMix: 1.0, attackMult: 1.0, releaseFastWeight: 0.0 }, // Safe
];
const FAST_RELEASE_RATIO = 0.15; // fixed fast-segment time vs. user release, blended per-style by releaseFastWeight

// Adaptive/auto release (compressor stage): maps real-time crest factor
// (peak/RMS in dB) to a release-time multiplier — dense/low-crest material
// releases slower (avoids pumping on material that's loud throughout),
// percussive/high-crest material releases faster (recovers between hits).
// Supersedes the style's fixed releaseFastWeight blend when enabled.
const CREST_LOW_DB = 4, CREST_HIGH_DB = 18;
const RELEASE_MULT_AT_LOW_CREST = 1.75; // slower
const RELEASE_MULT_AT_HIGH_CREST = 0.5; // faster

// ── Chain order ─────────────────────────────────────────────────────────────
// Index into CHAIN_ORDERS comes from the `chainOrder` param; content.js's
// AUDIOFX_CHAIN_ORDER_LABELS must describe these permutations in the same
// order. Keep in sync.
const ST_EQ = 0, ST_COMP = 1, ST_LIM = 2;
const CHAIN_ORDERS = [
  [ST_EQ, ST_COMP, ST_LIM],
  [ST_EQ, ST_LIM, ST_COMP],
  [ST_COMP, ST_EQ, ST_LIM],
  [ST_COMP, ST_LIM, ST_EQ],
  [ST_LIM, ST_EQ, ST_COMP],
  [ST_LIM, ST_COMP, ST_EQ],
];

// Limiter attack time constant as a fraction of the lookahead: τ = D·0.25
// means the one-pole envelope has covered 1-e⁻⁴ ≈ 98.2% of the required
// reduction by the time the detected transient exits the delay line. The
// remaining ~2% (≈0.15dB on a 10dB hit) is what the final safety clamp eats.
const LIM_ATTACK_FRACTION = 0.25;

// ── EQ ──────────────────────────────────────────────────────────────────────
const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_Q = 1.41;
const EQ_GAIN_SMOOTH_SEC = 0.04;
// RBJ cookbook peaking EQ — bit-matches what BiquadFilterNode type='peaking'
// is specced to compute, so moving the EQ in here from native nodes did not
// change its curve.
function designBiquadPeaking(f0, gainDb, Q, fs) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const cosw0 = Math.cos(w0), sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Q);
  const b0 = 1 + alpha * A;
  const b1 = -2 * cosw0;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha / A;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

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
      // ── Compressor stage ──
      { name: 'compEnabled', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'threshold', defaultValue: -3, minValue: -60, maxValue: 0, automationRate: 'k-rate' },
      { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20, automationRate: 'k-rate' },
      { name: 'attack', defaultValue: 3, minValue: 0, maxValue: 100, automationRate: 'k-rate' }, // ms
      { name: 'release', defaultValue: 250, minValue: 0, maxValue: 1000, automationRate: 'k-rate' }, // ms
      { name: 'knee', defaultValue: 0, minValue: 0, maxValue: 40, automationRate: 'k-rate' }, // dB
      { name: 'style', defaultValue: 3, minValue: 0, maxValue: 6, automationRate: 'k-rate' }, // index into STYLE_PRESETS, default Allround
      { name: 'autoRelease', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'autoGain', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // ── Limiter stage ── (`enabled` keeps its historical name — it has
      // always been the "Лимитер" toggle's param — but now gates only the
      // limiter stage, not the whole node.)
      { name: 'enabled', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'ceiling', defaultValue: -0.3, minValue: -20, maxValue: 0, automationRate: 'k-rate' }, // dB
      // Right-channel ceiling override — only honored in Unlinked mode
      // (processingMode===1); `ceiling` above always remains the left/shared
      // ceiling. Defaults equal to `ceiling`'s default so leaving it untouched
      // is a no-op.
      { name: 'ceilingR', defaultValue: -0.3, minValue: -20, maxValue: 0, automationRate: 'k-rate' }, // dB
      { name: 'limRelease', defaultValue: 50, minValue: 1, maxValue: 1000, automationRate: 'k-rate' }, // ms
      // Drive gain applied only to the signal entering the limiter stage
      // (written into its delay line and used for peak detection), separate
      // from the chain-wide `inputGain`/`outputGain` pair. Since the ceiling
      // clamp still enforces the same output level regardless, this purely
      // trades off how much gain reduction the limiter does to get there —
      // the classic "push it into the limiter harder" knob.
      { name: 'limGain', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' }, // dB
      { name: 'truePeakMode', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // Index into OVERSAMPLE_FACTORS ([2,4,8,16]) — which polyphase FIR bank
      // true-peak detection uses. Only consulted when truePeakMode is on.
      { name: 'oversampling', defaultValue: 1, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      // ── EQ stage ──
      { name: 'eqEnabled', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      ...EQ_FREQS.map((f, i) => (
        { name: 'band' + i, defaultValue: 0, minValue: -12, maxValue: 12, automationRate: 'k-rate' }
      )),
      // Per-band center frequency — draggable horizontally in content.js's EQ
      // graph, independent of the fixed ISO defaults in EQ_FREQS.
      ...EQ_FREQS.map((f, i) => (
        { name: 'freq' + i, defaultValue: f, minValue: 20, maxValue: 20000, automationRate: 'k-rate' }
      )),
      // Per-band Q (bandwidth/width) — mouse-wheel-adjustable on a band's dot
      // in content.js's EQ graph. Same range as the graph's own clamp.
      ...EQ_FREQS.map((_, i) => (
        { name: 'q' + i, defaultValue: EQ_Q, minValue: 0.3, maxValue: 8, automationRate: 'k-rate' }
      )),
      // ── Global ──
      // Index into CHAIN_ORDERS — which permutation of EQ/Comp/Lim runs.
      { name: 'chainOrder', defaultValue: 0, minValue: 0, maxValue: 5, automationRate: 'k-rate' },
      { name: 'inputGain', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' }, // dB
      { name: 'outputGain', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' }, // dB
      // Gates the K-weighting/LUFS accumulation entirely — content.js only
      // sets this to 1 while the Метринг tab is actually the open tab, so
      // users who never look at it pay zero extra per-sample cost.
      { name: 'meteringActive', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // 0 = Stereo Linked (default), 1 = Unlinked (independent per-channel
      // gain), 2 = Mid/Side (independent gain on the encoded mid/side
      // signal). Applies to both dynamics stages; silently falls back to 0
      // unless channelCount === 2.
      { name: 'processingMode', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this._lookaheadSamples = Math.round(sampleRate * 0.005); // 5ms
    this._bufLen = this._lookaheadSamples + 32; // small headroom
    this._delayBuf = null;
    this._writeIdx = 0;
    this._rmsCoeff = 1 - Math.exp(-1 / (sampleRate * 0.002)); // ~2ms leaky-RMS window, fixed internal constant
    this._reportCounter = 0;

    // Compressor stage state — linked (single) and per-lane (Unlinked/M-S)
    // copies. envDb values are current smoothed gain reduction in dB
    // (0 = no reduction).
    this._cEnvDb = 0;
    this._cRmsSq = 0;
    this._cEnvDbLane = new Float64Array(2);
    this._cRmsSqLane = new Float64Array(2);

    // Auto Gain: a cheap approximation of loudness-matched bypass A/B —
    // rather than an independent dual-path LUFS comparison, track a slow
    // (~1.5s) running average of the compressor envelope's own applied
    // reduction and feed back the negative of it as makeup gain, so toggling
    // the compressor doesn't just make the track louder (which biases any
    // A/B towards "on" regardless of whether the character is actually
    // preferred). An approximation, not a literal loudness match.
    this._autoGainCoeff = 1 - Math.exp(-1 / (sampleRate * 1.5));
    this._agTrimDb = 0;
    this._agTrimDbLane = new Float64Array(2);

    // Limiter stage envelope — its attack is fixed (tied to the lookahead,
    // see LIM_ATTACK_FRACTION), only its release is user-set.
    this._lEnvDb = 0;
    this._lEnvDbLane = new Float64Array(2);

    // EQ stage: current (smoothed) gain + center frequency + Q (width) per
    // band, designed coefficients (null = band at 0dB, stage skips it), and
    // DF1 state allocated per channel count in _ensureBuffers.
    this._eqGainCur = new Float64Array(EQ_FREQS.length);
    this._eqFreqCur = Float64Array.from(EQ_FREQS);
    this._eqQCur = new Float64Array(EQ_FREQS.length).fill(EQ_Q);
    this._eqCoeffs = new Array(EQ_FREQS.length).fill(null);
    this._eqState = null;

    this._frame = null; // per-sample scratch, one slot per channel
    this._laneVals = new Float64Array(2); // per-sample scratch for Unlinked/M-S lanes

    // Max-since-last-report accumulators. Must persist across process() calls
    // (each call only covers one ~128-frame render quantum, but a report is
    // only sent every 8 calls) — previously declared as locals inside
    // process(), which reset them to 0 every single call and silently
    // discarded 7 out of every 8 blocks' worth of peak data, so the reported
    // value only ever reflected the last ~3ms before a report instead of the
    // full ~21ms since the previous one. That's what made the meters read as
    // randomly jumping between reports instead of tracking the real peak.
    this._maxCompReductionSinceReport = 0;
    this._maxLimReductionSinceReport = 0;
    this._maxTruePeakSinceReport = 0;
    this._maxRawPeakSinceReport = 0;

    // LUFS/LRA metering — sampleRate is fixed for the worklet's lifetime, so
    // the K-weighting coefficients are designed once and cached.
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
    this._frame = new Float64Array(channelCount);
    this._eqState = new Float64Array(EQ_FREQS.length * channelCount * 4); // x1,x2,y1,y2 per band per channel
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

    const compEnabled = parameters.compEnabled[0] >= 0.5;
    const threshold = parameters.threshold[0];
    const ratio = Math.max(1, parameters.ratio[0]);
    const attackMs = parameters.attack[0];
    const releaseMs = parameters.release[0];
    const knee = Math.max(0, parameters.knee[0]);
    const styleIdx = Math.max(0, Math.min(STYLE_PRESETS.length - 1, Math.round(parameters.style[0])));
    const style = STYLE_PRESETS[styleIdx];
    const autoRelease = parameters.autoRelease[0] >= 0.5;
    const autoGain = parameters.autoGain[0] >= 0.5;

    const limEnabled = parameters.enabled[0] >= 0.5;
    const ceilingDb = parameters.ceiling[0];
    const ceilingRDb = parameters.ceilingR[0];
    const limReleaseMs = Math.max(1, parameters.limRelease[0]);
    const limGainDb = parameters.limGain[0];
    const truePeakMode = parameters.truePeakMode[0] >= 0.5;
    const oversampleIdx = Math.max(0, Math.min(OVERSAMPLE_FACTORS.length - 1, Math.round(parameters.oversampling[0])));
    const polyphaseBank = POLYPHASE_BANKS[oversampleIdx];

    const eqEnabled = parameters.eqEnabled[0] >= 0.5;
    const order = CHAIN_ORDERS[Math.max(0, Math.min(CHAIN_ORDERS.length - 1, Math.round(parameters.chainOrder[0])))];
    const inputGainDb = parameters.inputGain[0];
    const outputGainDb = parameters.outputGain[0];
    const meteringActive = parameters.meteringActive[0] >= 0.5;
    const processingMode = channelCount === 2 ? Math.max(0, Math.min(2, Math.round(parameters.processingMode[0]))) : 0;

    // Input/Output trim are chain-wide controls, independent of every stage's
    // own enable switch — they must keep working even with EQ/comp/limiter
    // all bypassed.
    const inputGainLin = Math.pow(10, inputGainDb / 20);
    const outputGainLin = Math.pow(10, outputGainDb / 20);
    // Gated on the limiter stage itself — a bypassed limiter must stay fully
    // transparent regardless of this knob.
    const limGainLin = limEnabled ? Math.pow(10, limGainDb / 20) : 1;
    const ceilingLin = Math.pow(10, ceilingDb / 20);
    // Only meaningfully different from ceilingLin in Unlinked mode.
    const ceilingRLin = Math.pow(10, ceilingRDb / 20);
    // The limiter envelope pre-compensates for the output gain applied after
    // the chain, so `ceiling` keeps meaning the level at the node's output
    // (as it always has), not at the limiter stage's own output. Only exact
    // when the limiter is the last stage — with EQ/comp deliberately ordered
    // after it, overshoot lands on the safety clamp, which is the user's
    // explicit trade to make.
    const limTargetDb = ceilingDb - outputGainDb;
    const limTargetRDb = ceilingRDb - outputGainDb;
    const halfKnee = knee / 2;

    // Compressor one-pole smoothing coefficients from attack/release time
    // constants. attackMult/releaseFastWeight are style character knobs
    // layered on top of the user's own attack/release sliders.
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

    // Limiter envelope coefficients — attack fixed to converge inside the
    // lookahead window (see LIM_ATTACK_FRACTION), release user-set.
    const limAttackCoeff = 1 - Math.exp(-1 / (this._lookaheadSamples * LIM_ATTACK_FRACTION));
    const limReleaseCoeff = 1 - Math.exp(-1 / (sampleRate * (limReleaseMs / 1000)));

    const frames = input[0].length;

    // EQ per-block prep: smooth each band's gain, center frequency AND Q
    // toward their targets (gain 0 when the EQ is bypassed, so disabling
    // fades to identity instead of clicking; freq/Q smoothed the same way so
    // dragging or wheel-adjusting a band's dot re-tunes instead of
    // zippering), redesign that band's coefficients only when any of the
    // three actually moved. null coefficients mark a band at 0dB — the
    // per-sample loop skips those entirely.
    const eqSmooth = 1 - Math.exp(-frames / (sampleRate * EQ_GAIN_SMOOTH_SEC));
    const eqCoeffs = this._eqCoeffs;
    for (let b = 0; b < EQ_FREQS.length; b++) {
      const gp = parameters['band' + b];
      const fp = parameters['freq' + b];
      const qp = parameters['q' + b];
      const targetGain = eqEnabled && gp ? Math.max(-12, Math.min(12, gp[0])) : 0;
      const targetFreq = fp ? Math.max(20, Math.min(20000, fp[0])) : EQ_FREQS[b];
      const targetQ = qp ? Math.max(0.3, Math.min(8, qp[0])) : EQ_Q;
      let curGain = this._eqGainCur[b];
      let curFreq = this._eqFreqCur[b];
      let curQ = this._eqQCur[b];
      const gainMoving = curGain !== targetGain;
      const freqMoving = curFreq !== targetFreq;
      const qMoving = curQ !== targetQ;
      if (gainMoving || freqMoving || qMoving) {
        if (gainMoving) {
          curGain += (targetGain - curGain) * eqSmooth;
          if (Math.abs(targetGain - curGain) < 0.01) curGain = targetGain;
          this._eqGainCur[b] = curGain;
        }
        if (freqMoving) {
          curFreq += (targetFreq - curFreq) * eqSmooth;
          if (Math.abs(targetFreq - curFreq) < 0.5) curFreq = targetFreq;
          this._eqFreqCur[b] = curFreq;
        }
        if (qMoving) {
          curQ += (targetQ - curQ) * eqSmooth;
          if (Math.abs(targetQ - curQ) < 0.005) curQ = targetQ;
          this._eqQCur[b] = curQ;
        }
        eqCoeffs[b] = Math.abs(curGain) > 0.01 ? designBiquadPeaking(curFreq, curGain, curQ, sampleRate) : null;
      }
    }

    const buf = this._delayBuf;
    const delaySamples = this._lookaheadSamples;
    const bufLen = this._bufLen;
    const frame = this._frame;
    const laneVals = this._laneVals;
    const eqState = this._eqState;

    // ── Stage closures — allocated once per render quantum, they process
    // `frame` in place so the chain-order loop can run them in any order. ──

    const eqStage = () => {
      for (let b = 0; b < EQ_FREQS.length; b++) {
        const co = eqCoeffs[b];
        if (!co) continue;
        for (let ch = 0; ch < channelCount; ch++) {
          const si = (b * channelCount + ch) * 4;
          const x = frame[ch];
          const y = co.b0 * x + co.b1 * eqState[si] + co.b2 * eqState[si + 1]
            - co.a1 * eqState[si + 2] - co.a2 * eqState[si + 3];
          eqState[si + 1] = eqState[si]; eqState[si] = x;
          eqState[si + 3] = eqState[si + 2]; eqState[si + 2] = y;
          frame[ch] = y;
        }
      }
    };

    const compDesiredDb = detectedLevel => {
      const peakDb = 20 * Math.log10(Math.max(detectedLevel, 1e-8));
      const over = peakDb - threshold;
      if (knee > 0 && over > -halfKnee && over < halfKnee) {
        const x = over + halfKnee;
        return halfKnee * Math.pow(x / knee, style.kneeShape) * (1 - 1 / ratio);
      }
      if (over >= halfKnee) return over * (1 - 1 / ratio);
      return 0;
    };

    // Crest-factor → release coefficient interpolation, shared by both the
    // linked and per-lane compressor paths.
    const compReleaseCoeff = (rawPeak, rmsSq) => {
      if (!autoRelease) return releaseCoeffStyled;
      const crestDb = 20 * Math.log10(Math.max(rawPeak, 1e-8)) - 10 * Math.log10(Math.max(rmsSq, 1e-8));
      let t = (crestDb - CREST_LOW_DB) / (CREST_HIGH_DB - CREST_LOW_DB);
      t = Math.max(0, Math.min(1, t));
      return releaseCoeffAutoLow + (releaseCoeffAutoHigh - releaseCoeffAutoLow) * t;
    };

    const compStage = () => {
      if (processingMode === 0) {
        let peak = 0;
        for (let ch = 0; ch < channelCount; ch++) {
          const a = Math.abs(frame[ch]);
          if (a > peak) peak = a;
        }
        this._cRmsSq += (peak * peak - this._cRmsSq) * this._rmsCoeff;
        const desired = compEnabled
          ? compDesiredDb(style.detectorMix * peak + (1 - style.detectorMix) * Math.sqrt(this._cRmsSq))
          : 0;
        this._cEnvDb += (desired - this._cEnvDb) * (desired > this._cEnvDb ? attackCoeff : compReleaseCoeff(peak, this._cRmsSq));
        if (this._cEnvDb > this._maxCompReductionSinceReport) this._maxCompReductionSinceReport = this._cEnvDb;
        if (autoGain) this._agTrimDb += (this._cEnvDb - this._agTrimDb) * this._autoGainCoeff;
        const g = Math.pow(10, (-this._cEnvDb + (autoGain ? this._agTrimDb : 0)) / 20);
        for (let ch = 0; ch < channelCount; ch++) frame[ch] *= g;
      } else {
        // Unlinked (1) / Mid-Side (2) — independent envelope per lane.
        if (processingMode === 2) {
          laneVals[0] = (frame[0] + frame[1]) * 0.5; // mid
          laneVals[1] = (frame[0] - frame[1]) * 0.5; // side
        } else {
          laneVals[0] = frame[0]; laneVals[1] = frame[1];
        }
        let maxRed = 0;
        for (let lane = 0; lane < 2; lane++) {
          const pk = Math.abs(laneVals[lane]);
          this._cRmsSqLane[lane] += (pk * pk - this._cRmsSqLane[lane]) * this._rmsCoeff;
          const desired = compEnabled
            ? compDesiredDb(style.detectorMix * pk + (1 - style.detectorMix) * Math.sqrt(this._cRmsSqLane[lane]))
            : 0;
          const env = this._cEnvDbLane[lane]
            + (desired - this._cEnvDbLane[lane]) * (desired > this._cEnvDbLane[lane] ? attackCoeff : compReleaseCoeff(pk, this._cRmsSqLane[lane]));
          this._cEnvDbLane[lane] = env;
          if (env > maxRed) maxRed = env;
          if (autoGain) this._agTrimDbLane[lane] += (env - this._agTrimDbLane[lane]) * this._autoGainCoeff;
          laneVals[lane] *= Math.pow(10, (-env + (autoGain ? this._agTrimDbLane[lane] : 0)) / 20);
        }
        if (maxRed > this._maxCompReductionSinceReport) this._maxCompReductionSinceReport = maxRed;
        if (processingMode === 2) {
          frame[0] = laneVals[0] + laneVals[1]; // M/S decode
          frame[1] = laneVals[0] - laneVals[1];
        } else {
          frame[0] = laneVals[0]; frame[1] = laneVals[1];
        }
      }
    };

    const limStage = () => {
      // Drive gain into the limiter's own delay line/detector — applied
      // ahead of both branches below since they both read from `frame`.
      // Because the ceiling clamp still targets the same output level, this
      // only changes how hard the limiter has to work to get there.
      if (limGainLin !== 1) {
        for (let ch = 0; ch < channelCount; ch++) frame[ch] *= limGainLin;
      }
      // The stage always routes through its delay line, even bypassed — so
      // the node's latency is constant and toggling the limiter never causes
      // a 5ms splice click; a bypassed stage just converges to unity gain.
      if (processingMode === 0) {
        let rawPeak = 0;
        for (let ch = 0; ch < channelCount; ch++) {
          buf[ch][this._writeIdx] = frame[ch];
          const a = Math.abs(frame[ch]);
          if (a > rawPeak) rawPeak = a;
        }
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
        const det = truePeakMode ? Math.max(rawPeak, truePeakEstimate) : rawPeak;
        const desired = limEnabled ? Math.max(0, 20 * Math.log10(Math.max(det, 1e-8)) - limTargetDb) : 0;
        this._lEnvDb += (desired - this._lEnvDb) * (desired > this._lEnvDb ? limAttackCoeff : limReleaseCoeff);
        if (this._lEnvDb > this._maxLimReductionSinceReport) this._maxLimReductionSinceReport = this._lEnvDb;
        const g = Math.pow(10, -this._lEnvDb / 20);
        const readIdx = (this._writeIdx - delaySamples + bufLen) % bufLen;
        for (let ch = 0; ch < channelCount; ch++) frame[ch] = buf[ch][readIdx] * g;
      } else {
        // Unlinked (1) / Mid-Side (2). Note: True Peak detection reads the
        // lane-domain ring buffer, so in M/S mode it estimates inter-sample
        // peaks of the encoded mid/side signal rather than the decoded L/R
        // output — a known, documented imprecision for that combination.
        if (processingMode === 2) {
          laneVals[0] = (frame[0] + frame[1]) * 0.5; // mid
          laneVals[1] = (frame[0] - frame[1]) * 0.5; // side
        } else {
          laneVals[0] = frame[0]; laneVals[1] = frame[1];
        }
        buf[0][this._writeIdx] = laneVals[0];
        buf[1][this._writeIdx] = laneVals[1];
        let truePeakEstimate = 0;
        if (truePeakMode) {
          for (let ch = 0; ch < 2; ch++) {
            const v = polyphaseMaxAbs(buf[ch], bufLen, this._writeIdx, polyphaseBank);
            if (v > truePeakEstimate) truePeakEstimate = v;
          }
          if (truePeakEstimate > this._maxTruePeakSinceReport) this._maxTruePeakSinceReport = truePeakEstimate;
        }
        const readIdx = (this._writeIdx - delaySamples + bufLen) % bufLen;
        let maxRed = 0;
        for (let lane = 0; lane < 2; lane++) {
          const pk = Math.abs(laneVals[lane]);
          const det = truePeakMode ? Math.max(pk, truePeakEstimate) : pk;
          // Separate right-channel ceiling only makes sense in Unlinked mode,
          // where lane1 already *is* R; in M/S mode a per-lane ceiling
          // wouldn't map to a per-ear ceiling — both lanes use the shared
          // target there.
          const targetDb = (processingMode === 1 && lane === 1) ? limTargetRDb : limTargetDb;
          const desired = limEnabled ? Math.max(0, 20 * Math.log10(Math.max(det, 1e-8)) - targetDb) : 0;
          const env = this._lEnvDbLane[lane]
            + (desired - this._lEnvDbLane[lane]) * (desired > this._lEnvDbLane[lane] ? limAttackCoeff : limReleaseCoeff);
          this._lEnvDbLane[lane] = env;
          if (env > maxRed) maxRed = env;
          laneVals[lane] = buf[lane][readIdx] * Math.pow(10, -env / 20);
        }
        if (maxRed > this._maxLimReductionSinceReport) this._maxLimReductionSinceReport = maxRed;
        if (processingMode === 2) {
          frame[0] = laneVals[0] + laneVals[1]; // M/S decode
          frame[1] = laneVals[0] - laneVals[1];
        } else {
          frame[0] = laneVals[0]; frame[1] = laneVals[1];
        }
      }
      this._writeIdx = (this._writeIdx + 1) % bufLen;
    };

    for (let n = 0; n < frames; n++) {
      let inPeak = 0;
      for (let ch = 0; ch < channelCount; ch++) {
        const s = input[ch][n] * inputGainLin;
        frame[ch] = s;
        const a = Math.abs(s);
        if (a > inPeak) inPeak = a;
      }
      if (inPeak > this._maxRawPeakSinceReport) this._maxRawPeakSinceReport = inPeak;

      // LUFS/LRA metering — K-weights the node's own input (post input gain,
      // pre any stage), independent of chain order and processing mode, as a
      // pre-processing loudness reference. Fully skipped when meteringActive
      // is off.
      if (meteringActive) {
        const kw1 = this._kw.stage1, kw2 = this._kw.stage2;
        let sumSqK = 0;
        for (let ch = 0; ch < channelCount; ch++) {
          const x = frame[ch];
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

      // The chain itself — stages mutate `frame` in the configured order.
      for (let s = 0; s < order.length; s++) {
        const st = order[s];
        if (st === ST_EQ) eqStage();
        else if (st === ST_COMP) compStage();
        else limStage();
      }

      for (let ch = 0; ch < channelCount; ch++) {
        let v = frame[ch] * outputGainLin;
        if (limEnabled) {
          // Safety clamp — the limiter envelope does the actual limiting now;
          // this only catches its convergence residue (and whatever the user
          // deliberately routes after the limiter stage).
          const c = (processingMode === 1 && ch === 1) ? ceilingRLin : ceilingLin;
          if (v > c) v = c;
          else if (v < -c) v = -c;
        }
        output[ch][n] = v;
      }
    }

    if (++this._reportCounter >= 8) {
      this._reportCounter = 0;
      const truePeakDb = truePeakMode ? 20 * Math.log10(Math.max(this._maxTruePeakSinceReport, 1e-8)) : null;
      const agTrim = processingMode === 0
        ? this._agTrimDb
        : Math.max(this._agTrimDbLane[0], this._agTrimDbLane[1]);
      this.port.postMessage({
        type: 'meter',
        reductionDb: this._maxCompReductionSinceReport,
        limReductionDb: this._maxLimReductionSinceReport,
        inputPeakDb: 20 * Math.log10(Math.max(this._maxRawPeakSinceReport, 1e-8)),
        truePeakDb,
        momentaryLufs: meteringActive ? this._momentaryLufs : null,
        shortTermLufs: meteringActive ? this._shortTermLufs : null,
        integratedLufs: meteringActive ? this._integratedLufs : null,
        lra: meteringActive ? this._lra : null,
        autoGainTrimDb: autoGain ? agTrim : null,
      });
      // Only reset here, once the accumulated max has actually been sent —
      // these must survive across the 8 process() calls between reports.
      this._maxCompReductionSinceReport = 0;
      this._maxLimReductionSinceReport = 0;
      this._maxTruePeakSinceReport = 0;
      this._maxRawPeakSinceReport = 0;
    }

    return true;
  }
}
registerProcessor('vmu-limiter', VmuLimiterProcessor);
