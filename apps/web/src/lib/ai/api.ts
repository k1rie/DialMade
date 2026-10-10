// Wire format of /api/ai/*, shared by the route handlers and useAiCopy. Client-safe (no SDK, no env).
import type { OutputKind } from "@dialmade/catalog";
import type { PatchOperation } from "@dialmade/doc";
import { z } from "zod";
import { MAX_INSTRUCTIONS_LENGTH, MAX_SECTION_IDS } from "./config";

const KINDS = ["brand", "landing", "app"] as const satisfies readonly OutputKind[];

export const COPY_ENDPOINT = "/api/ai/copy";
export const STATUS_ENDPOINT = "/api/ai/status";
/** The doc travels whole; a large one is ~100 KB. */
export const MAX_COPY_BODY_BYTES = 1_000_000;

export const CopyRequestBodySchema = z.strictObject({
  /** Validated with `safeParseDesignDoc` on the server. */
  doc: z.unknown(),
  kind: z.enum(KINDS),
  sectionIds: z.array(z.string().min(1).max(64)).min(1).max(MAX_SECTION_IDS).optional(),
  instructions: z.string().max(MAX_INSTRUCTIONS_LENGTH).optional(),
  locale: z.enum(["es", "en"]),
});
export type CopyRequestBody = z.infer<typeof CopyRequestBodySchema>;

export type CopyApiUsage = { inputTokens: number; outputTokens: number; model: string };

export type CopyApiSuccess = {
  patches: PatchOperation[];
  usage: CopyApiUsage;
  costUsd: number;
  /** Edits of the model that did not pass validation (dropped). */
  rejected: number;
  /** Hosted budget left this month after this request; `null` with BYOK. */
  remainingBudgetUsd: number | null;
};

export const COPY_API_ERROR_CODES = [
  "ai-not-configured",
  "invalid-request",
  "payload-too-large",
  "no-page",
  "no-fields",
  "budget-exceeded",
  "daily-limit",
  "rate-limited",
  "overloaded",
  "refused",
  "invalid-response",
  "invalid-key",
  "upstream-error",
  "network",
  "aborted",
] as const;
export type CopyApiErrorCode = (typeof COPY_API_ERROR_CODES)[number];

export type CopyApiError = {
  code: CopyApiErrorCode;
  /** English, for logs. The UI shows its own localized text per code. */
  message: string;
  remainingBudgetUsd?: number;
  retryAfterSeconds?: number;
};

export type AiStatus = {
  configured: boolean;
  model: string;
  /** `null` when the hosted AI is off. */
  remainingBudgetUsd: number | null;
  /** Reservation of a typical request: below it the hosted AI can only answer 402. */
  minRequestUsd: number;
};

export const isCopyApiErrorCode = (value: unknown): value is CopyApiErrorCode =>
  typeof value === "string" && (COPY_API_ERROR_CODES as readonly string[]).includes(value);
