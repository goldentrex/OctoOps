import { describe, expect, it } from "vitest";
import { luhnValid, maxSeverity, redact, scanDlp } from "../detectors/dlp";

describe("DLP detector", () => {
  it("catches OpenAI-style secret keys", () => {
    const hits = scanDlp("Use sk-live-987654321abcdef for staging.");
    expect(hits.some((h) => h.rule === "secret.openai_key")).toBe(true);
  });

  it("ignores too-short sk- prefixes (near-miss)", () => {
    expect(scanDlp("sk-short")).toHaveLength(0);
  });

  it("catches AWS access key ids", () => {
    const hits = scanDlp("key AKIAIOSFODNN7EXAMPLE inside config");
    expect(hits.some((h) => h.rule === "secret.aws_key")).toBe(true);
  });

  it("catches bearer tokens", () => {
    const hits = scanDlp("Authorization: Bearer abc123.def456-ghi789");
    expect(hits.some((h) => h.rule === "secret.bearer_token")).toBe(true);
  });

  it("catches api_key assignments", () => {
    const hits = scanDlp('api_key = "ab12cd34ef56"');
    expect(hits.some((h) => h.rule === "secret.api_key_assignment")).toBe(true);
  });

  it("catches Singapore NRIC/FIN", () => {
    for (const nric of ["S1234567D", "T7654321B", "F1234567N", "G9876543X", "M1112223J"]) {
      const hits = scanDlp(`Customer NRIC ${nric} on file.`);
      expect(hits.some((h) => h.rule === "pii.sg_nric")).toBe(true);
    }
  });

  it("ignores NRIC near-misses (wrong digit count / prefix)", () => {
    expect(scanDlp("S123456D")).toHaveLength(0); // 6 digits
    expect(scanDlp("A1234567D")).toHaveLength(0); // wrong prefix
  });

  it("catches US SSNs", () => {
    const hits = scanDlp("SSN 123-45-6789 leaked");
    expect(hits.some((h) => h.rule === "pii.ssn")).toBe(true);
  });

  it("luhn helper validates known numbers", () => {
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
  });

  it("catches Luhn-valid card numbers, with or without separators", () => {
    expect(
      scanDlp("card 4111 1111 1111 1111 on file").some((h) => h.rule === "pii.card_number")
    ).toBe(true);
    expect(
      scanDlp("card 4111111111111111 on file").some((h) => h.rule === "pii.card_number")
    ).toBe(true);
  });

  it("ignores Luhn-invalid 16-digit numbers (near-miss)", () => {
    expect(scanDlp("order id 4111111111111112 shipped")).toHaveLength(0);
  });

  it("catches confidential / internal-only markers", () => {
    expect(
      scanDlp("CONFIDENTIAL: do not distribute.").some((h) => h.rule === "marker.confidential")
    ).toBe(true);
    expect(
      scanDlp("internal-only document").some((h) => h.rule === "marker.confidential")
    ).toBe(true);
  });

  it("does not flag the word confidentiality (near-miss)", () => {
    expect(scanDlp("We value confidentiality and trust.")).toHaveLength(0);
  });

  it("catches margin / pricing / cap-table sheets", () => {
    expect(
      scanDlp("attaching the margin sheet").some((h) => h.rule === "marker.margin_pricing")
    ).toBe(true);
    expect(
      scanDlp("secret 45% discount sheet").some((h) => h.rule === "marker.margin_pricing")
    ).toBe(true);
    expect(
      scanDlp("Northlight_Capital_Internal_CapTable_Confidential.pdf").some(
        (h) => h.rule === "marker.margin_pricing" || h.rule === "marker.confidential"
      )
    ).toBe(true);
  });

  it("clean marketing text produces zero hits", () => {
    expect(
      scanDlp("Hi team, sharing our Q4 onboarding checklist and verified milestone summary.")
    ).toHaveLength(0);
  });

  it("maxSeverity ranks CRITICAL over HIGH over LOW", () => {
    const hits = scanDlp("confidential and sk-live-987654321abcdef");
    expect(maxSeverity(hits)).toBe("CRITICAL");
    expect(maxSeverity(scanDlp("confidential"))).toBe("HIGH");
    expect(maxSeverity([])).toBeUndefined();
  });

  it("redact() replaces every span and keeps surrounding text", () => {
    const text = "key sk-live-987654321abcdef and NRIC S1234567D end";
    const hits = scanDlp(text);
    const out = redact(text, hits);
    expect(out).not.toContain("sk-live-987654321abcdef");
    expect(out).not.toContain("S1234567D");
    expect(out).toContain("[REDACTED:secret.openai_key]");
    expect(out).toContain("[REDACTED:pii.sg_nric]");
    expect(out.startsWith("key ")).toBe(true);
    expect(out.endsWith(" end")).toBe(true);
  });
});