// ============================================================================
// AvePoint starter-kit sensitivity classifier.
// Taxonomy: public / internal / client-confidential / regulated.
// Rule: the higher level wins; a file is as sensitive as its most sensitive
// line. Header labels are trusted but content can ESCALATE (never downgrade).
// Scored against rules/ground_truth_labels.json in evals/avepoint.ts.
// ============================================================================

export type Sensitivity = "public" | "internal" | "client-confidential" | "regulated";

export const SENSITIVITY_RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  "client-confidential": 2,
  regulated: 3,
};

export function maxSensitivity(levels: Sensitivity[]): Sensitivity {
  return levels.reduce<Sensitivity>(
    (best, l) => (SENSITIVITY_RANK[l] > SENSITIVITY_RANK[best] ? l : best),
    "public"
  );
}

const HEADER_RE = /^sensitivity:\s*(public|internal|client-confidential|regulated)\s*$/im;

/** Content hints from the kit's taxonomy.md detection-hints table. */
export function contentSensitivity(text: string, path = ""): Sensitivity[] {
  const levels: Sensitivity[] = [];
  const lower = text.toLowerCase();

  // regulated: NRIC/FIN, bank/card/PayNow, health data, home address, contact lists
  if (/\b[STFGM]\d{7}[A-Z]\b/i.test(text)) levels.push("regulated");
  // The business's own receiving details printed on an issued invoice are
  // internal (ground truth); personal/account files are regulated.
  const issuedInvoice = /invoice/i.test(path) && /bill to/i.test(text);
  if (!issuedInvoice && /\b(?:bank account|paynow|card on file|account:\s*dbs|iban)\b/i.test(text)) levels.push("regulated");
  if (/\b(?:appointment export|patient (?:data|records|names|list)|diagnosis|medical (?:details|records|history))\b/i.test(text)) levels.push("regulated");
  if (/\bhome address\b/i.test(text)) levels.push("regulated");
  if (/\+65[\s\d-]{6,}/.test(text) && /@/.test(text)) levels.push("regulated"); // contact list of identifiable people
  if (/\bpersonal loan\b/i.test(text)) levels.push("regulated");
  if (/owner'?s private notes/i.test(text)) levels.push("regulated");

  // client-confidential: contracts/proposals/quotes, client figures, unannounced plans
  if (/\b(?:contract|agreement|proposal|quote|retainer)\b/i.test(lower) && /\b(?:client|prepared for|bill to)\b/i.test(lower)) {
    levels.push("client-confidential");
  }
  if (/\b(?:unannounced|not public|isn't public|keep quiet|keep .* to yourself|nda|strictly confidential|do not go below)\b/i.test(text)) {
    levels.push("client-confidential");
  }
  if (/^clients\//.test(path)) levels.push("client-confidential");

  // internal: invoices issued, suppliers, plans, reminders
  if (/\b(?:invoice|supplier|weekly plan|to-do|reminder|unpaid)\b/i.test(lower)) levels.push("internal");
  if (/^(finance\/invoice|notes\/|admin\/supplier)/.test(path)) levels.push("internal");

  // public: website copy, price list, approved case studies, vendor marketing
  if (/\b(?:approved for publication|published rates|price list)\b/i.test(lower)) levels.push("public");
  if (/^(marketing\/website|marketing\/price_list|marketing\/case_study)/.test(path)) levels.push("public");

  return levels;
}

export function classifyFile(path: string, content: string): Sensitivity {
  const header = content.match(HEADER_RE)?.[1] as Sensitivity | undefined;
  const hints = contentSensitivity(content, path);
  // A CSV of identifiable people is regulated even without prose hints.
  if (/\.csv$/i.test(path) && /email/i.test(content) && /phone/i.test(content)) {
    hints.push("regulated");
  }
  return maxSensitivity([...(header ? [header] : []), ...hints]);
}