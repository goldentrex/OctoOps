// ============================================================================
// G2 Client wall (Chinese Wall, plan 3.1): the tenant label of every
// attachment and context source must equal the recipient tenant, resolved
// from the email domain / CRM contact. Unlabeled provenance fails closed.
// Look-alike domains are flagged instead of silently treated as new clients.
// ============================================================================

import type { GuardAction, LabeledSource, TenantRegistry } from "../types";

/** "Meridian Robotics (Enterprise Account)" ~ "meridian robotics" */
export function normalizeTenantLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[b.length];
}

export interface DomainResolution {
  domain: string;
  tenant?: string;
  lookalikeOf?: string;
}

export function resolveEmailDomain(
  email: string,
  registry: TenantRegistry
): DomainResolution {
  const domain = (email.split("@")[1] ?? "").toLowerCase().trim();
  const known = registry.domains[domain];
  if (known) return { domain, tenant: known };

  for (const knownDomain of Object.keys(registry.domains)) {
    const dist = levenshtein(domain, knownDomain);
    if (dist > 0 && dist <= 2) {
      return { domain, lookalikeOf: knownDomain };
    }
    // Same second-level domain with a swapped TLD (meridian.sg -> meridian.com)
    const base = domain.split(".")[0];
    const knownBase = knownDomain.split(".")[0];
    if (base.length >= 4 && base === knownBase && domain !== knownDomain) {
      return { domain, lookalikeOf: knownDomain };
    }
  }
  return { domain };
}

export interface ClientWallResult {
  ok: boolean;
  violations: string[];
  recipientTenant?: string;
  recipientKnown: boolean;
}

function checkSources(
  sources: LabeledSource[],
  kind: "attachment" | "context source",
  recipientNormalized: string | undefined,
  recipientKnown: boolean,
  violations: string[]
): void {
  for (const src of sources) {
    if (!src.tenant) {
      violations.push(
        `Unlabeled ${kind} "${src.name}": provenance tenant missing (fail closed).`
      );
      continue;
    }
    const srcNormalized = normalizeTenantLabel(src.tenant);
    if (!recipientKnown) {
      violations.push(
        `${kind} "${src.name}" belongs to ${src.tenant} but the recipient tenant could not be verified.`
      );
      continue;
    }
    if (recipientNormalized && srcNormalized !== recipientNormalized) {
      violations.push(
        `Cross-client leak: ${kind} "${src.name}" belongs to ${src.tenant}, recipient is a different tenant.`
      );
    }
  }
}

export function checkClientWall(
  action: GuardAction,
  registry: TenantRegistry
): ClientWallResult {
  const violations: string[] = [];
  let recipientTenant = action.recipientTenant;
  let recipientKnown = Boolean(recipientTenant);

  if (action.recipientEmail) {
    const resolved = resolveEmailDomain(action.recipientEmail, registry);
    if (resolved.lookalikeOf) {
      violations.push(
        `Look-alike domain "${resolved.domain}" resembles client domain "${resolved.lookalikeOf}".`
      );
      recipientKnown = false;
    } else if (resolved.tenant) {
      if (
        recipientTenant &&
        normalizeTenantLabel(resolved.tenant) !==
          normalizeTenantLabel(recipientTenant)
      ) {
        violations.push(
          `Recipient label "${recipientTenant}" does not match email domain tenant "${resolved.tenant}".`
        );
      }
      recipientTenant = resolved.tenant;
      recipientKnown = true;
    } else {
      recipientKnown = false;
    }
  }

  const recipientNormalized = recipientTenant
    ? normalizeTenantLabel(recipientTenant)
    : undefined;

  const attachments = action.attachments ?? [];
  const contextSources = action.contextSources ?? [];

  if (action.actionType === "PUBLISH_ARTICLE") {
    // Public publishing: any client-labeled source is a boundary crossing.
    for (const src of [...attachments, ...contextSources]) {
      if (src.tenant) {
        violations.push(
          `Client-tenant source "${src.name}" (${src.tenant}) in a public publish payload.`
        );
      }
    }
  } else {
    checkSources(attachments, "attachment", recipientNormalized, recipientKnown, violations);
    checkSources(contextSources, "context source", recipientNormalized, recipientKnown, violations);
  }

  return {
    ok: violations.length === 0,
    violations,
    recipientTenant,
    recipientKnown,
  };
}