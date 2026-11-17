import { isBoardMemberAgent } from "@/data/mockOctoData";
import { GovernanceAuditEvent, JobSeat, OctoAgent } from "@/types/octo";

export const OCTOOPS_STORAGE_KEY = "octoops-demo-state-v2";

export interface PersistedOctoState {
  activePresetId: string;
  seats: JobSeat[];
  candidates: OctoAgent[];
  auditLog: GovernanceAuditEvent[];
  savedAt: number;
}

export function loadPersistedOctoState(): PersistedOctoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OCTOOPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedOctoState;
    if (
      !parsed ||
      typeof parsed.activePresetId !== "string" ||
      !Array.isArray(parsed.seats) ||
      !Array.isArray(parsed.candidates)
    ) {
      return null;
    }
    const sanitizedCandidates = parsed.candidates.filter(
      (c) => !isBoardMemberAgent(c)
    );
    const validCandidateIds = new Set(sanitizedCandidates.map((c) => c.id));
    const sanitizedSeats = parsed.seats.map((s) =>
      s.occupantId && !validCandidateIds.has(s.occupantId)
        ? { ...s, occupantId: null }
        : s
    );

    return {
      ...parsed,
      seats: sanitizedSeats,
      candidates: sanitizedCandidates,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    };
  } catch {
    return null;
  }
}

export function savePersistedOctoState(state: PersistedOctoState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OCTOOPS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export function clearPersistedOctoState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(OCTOOPS_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
