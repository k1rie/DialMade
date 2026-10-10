// The AI access policy as the browser sees it (importar-guia.md, «Política de acceso a la IA»), shared
// by useAiCopy, useAiVision and the meter: free tier → then BYOK or «Copiar prompt para mi Claude».
// Pure and client-safe.
import type { AiApiErrorCode, AiStatusResponse } from "./api";
import { DEFAULT_AI_MODEL, DEFAULT_FREE_USES_PER_MONTH } from "./config";

export const OFFLINE_AI_STATUS: AiStatusResponse = {
  configured: false,
  model: DEFAULT_AI_MODEL,
  freeModel: DEFAULT_AI_MODEL,
  freeUsesTotal: DEFAULT_FREE_USES_PER_MONTH,
  freeUsesRemaining: 0,
  remainingBudgetUsd: null,
  minRequestUsd: 0,
};

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/** GET /api/ai/status → a complete status; anything missing or malformed falls back to «off». */
export function normalizeAiStatus(raw: unknown): AiStatusResponse {
  if (!raw || typeof raw !== "object") return OFFLINE_AI_STATUS;
  const value = raw as Record<string, unknown>;
  const model = isText(value.model) ? value.model : DEFAULT_AI_MODEL;
  return {
    configured: value.configured === true,
    model,
    freeModel: isText(value.freeModel) ? value.freeModel : model,
    freeUsesTotal: isCount(value.freeUsesTotal) ? Math.floor(value.freeUsesTotal) : DEFAULT_FREE_USES_PER_MONTH,
    freeUsesRemaining: isCount(value.freeUsesRemaining) ? Math.floor(value.freeUsesRemaining) : 0,
    remainingBudgetUsd: isCount(value.remainingBudgetUsd) ? value.remainingBudgetUsd : null,
    minRequestUsd: isCount(value.minRequestUsd) ? value.minRequestUsd : 0,
  };
}

export type AiCounters = { remainingBudgetUsd?: number | null; freeUsesRemaining?: number; freeUsesTotal?: number };

/** The counters every hosted answer carries, success or error («3 de 5» stays in sync without a refetch). */
export function countersFrom(body: unknown): AiCounters {
  if (!body || typeof body !== "object") return {};
  const value = body as Record<string, unknown>;
  return {
    ...(isCount(value.remainingBudgetUsd) && { remainingBudgetUsd: value.remainingBudgetUsd }),
    ...(isCount(value.freeUsesRemaining) && { freeUsesRemaining: Math.floor(value.freeUsesRemaining) }),
    ...(isCount(value.freeUsesTotal) && { freeUsesTotal: Math.floor(value.freeUsesTotal) }),
  };
}

export function mergeAiCounters(status: AiStatusResponse, counters: AiCounters): AiStatusResponse {
  if (Object.keys(counters).length === 0) return status;
  return { ...status, ...counters };
}

/** Why the hosted AI cannot take a request now (the UI then offers BYOK or «mi Claude»). */
export type AiFallbackReason = "free-tier-exhausted" | "budget-exceeded" | "daily-limit" | "not-configured";

export function hostedBlocker(status: AiStatusResponse | null): AiFallbackReason | null {
  if (!status?.configured) return "not-configured";
  if (status.freeUsesRemaining <= 0) return "free-tier-exhausted";
  const budget = status.remainingBudgetUsd ?? 0;
  if (budget <= 0 || budget < status.minRequestUsd) return "budget-exceeded";
  return null;
}

/** Error code of a hosted answer → the reason to offer the way out; `null` for errors a retry may fix. */
export function fallbackReasonOf(code: AiApiErrorCode): AiFallbackReason | null {
  switch (code) {
    case "free-tier-exhausted":
      return "free-tier-exhausted";
    case "budget-exceeded":
      return "budget-exceeded";
    case "daily-limit":
      return "daily-limit";
    case "ai-not-configured":
      return "not-configured";
    default:
      return null;
  }
}

export type AiSource = "byok" | "hosted";

/** The user's key wins; otherwise the free tier when it can still answer. */
export function aiSourceFor(status: AiStatusResponse | null, byokActive: boolean): AiSource | null {
  if (byokActive) return "byok";
  return hostedBlocker(status) === null ? "hosted" : null;
}

/** BYOK and «mi Claude» use DIALMADE_AI_MODEL; the free tier uses DIALMADE_AI_FREE_MODEL. */
export function modelFor(source: AiSource | null, status: AiStatusResponse | null): string {
  const current = status ?? OFFLINE_AI_STATUS;
  return source === "hosted" ? current.freeModel : current.model;
}
