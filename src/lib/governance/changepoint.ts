// ============================================================================
// Behavioral changepoint detection (U3) — Bayesian online changepoint detection
// in the spirit of Adams & MacKay (2007, arXiv:0710.3742): compare the
// predictive evidence for "the current regime continues" vs "a new regime
// began". We use a tractable, robust two-hypothesis form: a recent-window
// Beta-Bernoulli posterior vs the long-run baseline posterior.
//
// Detects when an agent's outcome stream CHANGES (model update, prompt
// injection, drift) in ~a dozen actions — far faster than the 14-day reputation
// decay. It detects *change*, not *badness*: a consistently bad agent is scored
// low, not flagged as "changed" (its recent window matches its baseline).
//
// Pure module, no I/O.
// ============================================================================

export interface ChangepointOptions {
  /** Recent-window size (observations). Detection latency ≈ this. */
  window?: number;
  /** Minimum total observations before detection (baseline must be established). */
  minObservations?: number;
  /** Practical significance margin on the clean-rate difference. */
  delta?: number;
  /** One-sided posterior probability required to declare a change (~0.975 ≈ 2σ). */
  threshold?: number;
  /** Observations to suppress after a detection (avoid re-firing). */
  cooldown?: number;
  /** Weak prior for both posteriors. */
  prior?: number;
}

export interface ChangepointState {
  /** Long-run baseline Beta counts (all history). */
  baseAlpha: number;
  baseBeta: number;
  /** Recent window outcomes (1 clean / 0 violation), oldest first. */
  window: number[];
  winAlpha: number;
  winBeta: number;
  observations: number;
  cooldown: number;
  opts: Required<ChangepointOptions>;
}

export interface ChangepointResult {
  changepoint: boolean;
  /** Posterior probability of a meaningful shift (0..1). */
  confidence: number;
  /** Recent-window clean rate. */
  newSegmentMean: number;
  /** Long-run baseline clean rate. */
  baselineMean: number;
  direction: "worsening" | "improving" | "none";
  /** Kept for API compatibility: recent window fill (proxy for run length). */
  mapRunLength: number;
}

const DEFAULTS: Required<ChangepointOptions> = {
  window: 14,
  minObservations: 30,
  delta: 0.15,
  threshold: 0.975,
  cooldown: 14,
  prior: 1,
};

export function createChangepointState(opts: ChangepointOptions = {}): ChangepointState {
  const o = { ...DEFAULTS, ...opts };
  return {
    baseAlpha: o.prior,
    baseBeta: o.prior,
    window: [],
    winAlpha: o.prior,
    winBeta: o.prior,
    observations: 0,
    cooldown: 0,
    opts: o,
  };
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 erf approximation). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

function betaMeanVar(a: number, b: number): { mean: number; var: number } {
  const s = a + b;
  return { mean: a / s, var: (a * b) / (s * s * (s + 1)) };
}

/**
 * Feed one confirmed outcome (clean = true / violation = false).
 * Mutates and returns the state plus the detection result.
 */
export function updateChangepoint(
  state: ChangepointState,
  clean: boolean
): ChangepointResult {
  const x = clean ? 1 : 0;
  const o = state.opts;

  state.baseAlpha += x;
  state.baseBeta += 1 - x;
  state.window.push(x);
  state.winAlpha += x;
  state.winBeta += 1 - x;
  if (state.window.length > o.window) {
    const old = state.window.shift()!;
    state.winAlpha -= old;
    state.winBeta -= 1 - old;
  }
  state.observations += 1;
  if (state.cooldown > 0) state.cooldown -= 1;

  const base = betaMeanVar(state.baseAlpha, state.baseBeta);
  const win = betaMeanVar(state.winAlpha, state.winBeta);
  const se = Math.sqrt(base.var + win.var);
  // One-sided evidence that the window rate is BELOW baseline by > delta
  // (worsening) or ABOVE baseline by > delta (improving).
  const zWorse = (base.mean - win.mean - o.delta) / se;
  const zBetter = (win.mean - base.mean - o.delta) / se;
  const pWorse = normCdf(zWorse);
  const pBetter = normCdf(zBetter);
  const confidence = Math.max(pWorse, pBetter);

  const ready =
    state.observations >= o.minObservations &&
    state.window.length >= o.window &&
    state.cooldown === 0;
  const changepoint = ready && confidence >= o.threshold;

  let direction: ChangepointResult["direction"] = "none";
  if (changepoint) {
    direction = pWorse >= pBetter ? "worsening" : "improving";
    state.cooldown = o.cooldown;
  }

  return {
    changepoint,
    confidence,
    newSegmentMean: win.mean,
    baselineMean: base.mean,
    direction,
    mapRunLength: state.window.length,
  };
}