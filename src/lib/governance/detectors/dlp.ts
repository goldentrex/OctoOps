// ============================================================================
// G3 DLP detector (plan 3.1): secrets, API keys, bearer tokens, card numbers
// (Luhn-validated), Singapore NRIC/FIN, SSN, confidential markers, margin /
// pricing sheets. Returns redaction spans.
// ============================================================================

import type { Severity } from "../types";

export interface DlpHit {
  rule: string;
  label: string;
  severity: Severity;
  start: number;
  end: number;
  match: string;
}

interface PatternRule {
  rule: string;
  label: string;
  severity: Severity;
  pattern: RegExp;
  validate?: (match: string) => boolean;
}

export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const RULES: PatternRule[] = [
  {
    rule: "secret.openai_key",
    label: "OpenAI-style secret key",
    severity: "CRITICAL",
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    rule: "secret.aws_key",
    label: "AWS access key id",
    severity: "CRITICAL",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    rule: "secret.github_token",
    label: "GitHub token",
    severity: "CRITICAL",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  },
  {
    rule: "secret.slack_token",
    label: "Slack token",
    severity: "CRITICAL",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    rule: "secret.api_key_assignment",
    label: "API key assignment",
    severity: "HIGH",
    pattern: /\bapi[_-]?key\s*[:=]\s*["']?[A-Za-z0-9._-]{6,}/gi,
  },
  {
    rule: "secret.bearer_token",
    label: "Bearer token",
    severity: "HIGH",
    pattern: /\bbearer\s+[A-Za-z0-9._\-/+=]{10,}/gi,
  },
  {
    rule: "pii.sg_nric",
    label: "Singapore NRIC/FIN",
    severity: "CRITICAL",
    pattern: /\b[STFGMstfgm]\d{7}[A-Za-z]\b/g,
  },
  {
    rule: "pii.ssn",
    label: "US SSN",
    severity: "CRITICAL",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    rule: "pii.card_number",
    label: "Payment card number (Luhn-valid)",
    severity: "CRITICAL",
    pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
    validate: (m) => luhnValid(m.replace(/[ -]/g, "")),
  },
  {
    rule: "marker.confidential",
    label: "Confidential / internal-only marker",
    severity: "HIGH",
    // Alphanumeric boundaries (not \b) so underscore filenames also match.
    pattern:
      /(?<![A-Za-z0-9])(confidential|internal[-_ ]only|do not (?:share|distribute)|nda[-_ ]protected)(?![A-Za-z0-9])/gi,
  },
  {
    rule: "marker.private_records",
    label: "Private injury/medical/retainer records",
    severity: "HIGH",
    pattern: /\bprivate\s+(?:injury|medical|retainer)\b/gi,
  },
  {
    rule: "marker.margin_pricing",
    label: "Margin / pricing / cap-table sheet",
    severity: "HIGH",
    pattern:
      /(?<![A-Za-z0-9])(?:margin|pricing|discount|rate)[-_ ](?:sheet|file|table|tier|card|rates?)(?![A-Za-z0-9])|(?<![A-Za-z0-9])cap[-_ ]?table(?![A-Za-z0-9])|(?<![A-Za-z0-9])internal[-_](?:cap[-_ ]?table|pricing|rates?)(?![A-Za-z0-9])/gi,
  },
];

export function scanDlp(text: string): DlpHit[] {
  const hits: DlpHit[] = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      if (rule.validate && !rule.validate(m[0])) continue;
      hits.push({
        rule: rule.rule,
        label: rule.label,
        severity: rule.severity,
        start: m.index,
        end: m.index + m[0].length,
        match: m[0],
      });
      if (m[0].length === 0) rule.pattern.lastIndex++;
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

export function maxSeverity(hits: DlpHit[]): Severity | undefined {
  if (hits.some((h) => h.severity === "CRITICAL")) return "CRITICAL";
  if (hits.some((h) => h.severity === "HIGH")) return "HIGH";
  if (hits.length > 0) return "LOW";
  return undefined;
}

/** Replace every hit span with a redaction marker (non-overlapping). */
export function redact(text: string, hits: DlpHit[]): string {
  const sorted = [...hits].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const hit of sorted) {
    if (hit.start < cursor) continue;
    out += text.slice(cursor, hit.start);
    out += `[REDACTED:${hit.rule}]`;
    cursor = hit.end;
  }
  out += text.slice(cursor);
  return out;
}