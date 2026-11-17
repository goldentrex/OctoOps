// ============================================================================
// Evidence-relative claim verification (N3 in docs/LITERATURE_REVIEW.md).
// FActScore-style atomic numeric claims, checked against the evidence pack
// the agent actually had, BEFORE the action executes (AvePoint rule R18).
// Deterministic; the Qwen G4 judge assists semantically when keyed.
// ============================================================================

export interface ClaimSource {
  name: string;
  text: string;
}

export type ClaimUnit = "percent" | "money" | "days" | "count";

export interface NumericClaim {
  raw: string;
  value: number;
  unit: ClaimUnit;
  start: number;
  end: number;
}

export interface ClaimFinding {
  claim: NumericClaim;
  sourceName: string;
  sourceLine: string;
  sourceValue: number;
}

export interface ClaimCheckResult {
  contradicted: ClaimFinding[];
  unsupported: NumericClaim[];
  supported: NumericClaim[];
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const MONTHS =
  "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*";

function toNumber(s: string): number {
  const cleaned = s.replace(/,/g, "").trim();
  if (/^\d+(\.\d+)?$/.test(cleaned)) return parseFloat(cleaned);
  return WORD_NUMBERS[cleaned.toLowerCase()] ?? NaN;
}

/** Extract atomic numeric claims. Dates ("24 Sep") are not claims. */
export function extractNumericClaims(text: string): NumericClaim[] {
  const claims: NumericClaim[] = [];
  const push = (m: RegExpExecArray, unit: ClaimUnit, valueStr: string) => {
    const value = toNumber(valueStr);
    if (Number.isNaN(value)) return;
    // skip dates: number immediately followed by a month name
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 12);
    if (unit !== "percent" && new RegExp(`^\\s+${MONTHS}\\b`, "i").test(after)) return;
    claims.push({ raw: m[0], value, unit, start: m.index, end: m.index + m[0].length });
  };

  const patterns: { re: RegExp; unit: ClaimUnit; group: number }[] = [
    { re: /(\d+(?:\.\d+)?)\s*%/g, unit: "percent", group: 1 },
    { re: /(?:SGD|S\$|\$)\s*(\d[\d,]*(?:\.\d+)?)/gi, unit: "money", group: 1 },
    { re: /\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/g, unit: "money", group: 1 },
    { re: /\b(\d+(?:\.\d+)?)\s*(?:dollars|SGD)\b/gi, unit: "money", group: 1 },
    {
      re: /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\b/gi,
      unit: "days",
      group: 1,
    },
    {
      re: /\b(\d+)\s+(?:extra\s+)?(?:units?|slides?|pages?|customers?|posts?|articles?|leads?|invoices?)\b/gi,
      unit: "count",
      group: 1,
    },
  ];

  for (const { re, unit, group } of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) push(m, unit, m[group]);
  }
  // Dedupe overlapping spans (e.g. "SGD 5,250" matched twice), keep first.
  claims.sort((a, b) => a.start - b.start);
  const out: NumericClaim[] = [];
  let cursor = -1;
  for (const c of claims) {
    if (c.start >= cursor) {
      out.push(c);
      cursor = c.end;
    }
  }
  return out;
}

function lineContaining(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  let end = text.indexOf("\n", index);
  if (end === -1) end = text.length;
  return text.slice(start, end).trim();
}

/**
 * Compare payload claims against the evidence pack.
 * contradicted = same unit class present in sources with a different value.
 * unsupported  = no source mentions that unit class at all.
 */
export function checkClaims(
  payloadText: string,
  sources: ClaimSource[]
): ClaimCheckResult {
  const claims = extractNumericClaims(payloadText);
  const sourceClaims: { claim: NumericClaim; source: ClaimSource; index: number }[] = [];
  for (const source of sources) {
    for (const claim of extractNumericClaims(source.text)) {
      sourceClaims.push({ claim, source, index: claim.start });
    }
  }

  const result: ClaimCheckResult = { contradicted: [], unsupported: [], supported: [] };
  for (const claim of claims) {
    const sameUnit = sourceClaims.filter((s) => s.claim.unit === claim.unit);
    const match = sameUnit.find(
      (s) => Math.abs(s.claim.value - claim.value) < 0.01
    );
    if (match) {
      result.supported.push(claim);
      continue;
    }
    if (sameUnit.length === 0) {
      result.unsupported.push(claim);
      continue;
    }
    // Cite the closest source value (smallest relative difference).
    const nearest = sameUnit.reduce((best, s) =>
      Math.abs(s.claim.value - claim.value) < Math.abs(best.claim.value - claim.value)
        ? s
        : best
    );
    result.contradicted.push({
      claim,
      sourceName: nearest.source.name,
      sourceLine: lineContaining(nearest.source.text, nearest.index),
      sourceValue: nearest.claim.value,
    });
  }
  return result;
}

/** Human-readable findings for guard reasons and the owner briefing. */
export function describeFindings(res: ClaimCheckResult): string[] {
  const lines: string[] = [];
  for (const f of res.contradicted) {
    lines.push(
      `Claim "${f.claim.raw}" contradicts ${f.sourceName}: "${f.sourceLine}" (source value ${f.sourceValue}).`
    );
  }
  for (const c of res.unsupported) {
    lines.push(`Claim "${c.raw}" has no supporting source in the evidence pack.`);
  }
  return lines;
}