// Wire format of /api/ai/*, shared by the route handlers and the hooks. Client-safe (no SDK, no env).
import type { OutputKind } from "@dialmade/catalog";
import type { PatchOperation } from "@dialmade/doc";
import { z } from "zod";
import { MAX_COPY_SCREENS, MAX_INSTRUCTIONS_LENGTH, MAX_SECTION_IDS } from "./config";

const KINDS = ["brand", "landing", "app"] as const satisfies readonly OutputKind[];

export const COPY_ENDPOINT = "/api/ai/copy";
export const STATUS_ENDPOINT = "/api/ai/status";
/**
 * Body limit of /api/ai/copy. The doc travels reduced (`aiRequestDoc`: the requested screens whole, the others as
 * stubs), about 260 KB per requested 200-block screen, so roughly 3–4 such screens fit in one request.
 */
export const MAX_COPY_BODY_BYTES = 1_000_000;

const SectionIdsSchema = z.array(z.string().min(1).max(64)).min(1).max(MAX_SECTION_IDS);

/** One page of the document (`doc.pages[kind]`): the body of every client before Modo Layout. */
export const CopyPageRequestBodySchema = z.strictObject({
  /** Validated with `safeParseDesignDoc` on the server (v1 is migrated). */
  doc: z.unknown(),
  kind: z.enum(KINDS),
  sectionIds: SectionIdsSchema.optional(),
  instructions: z.string().max(MAX_INSTRUCTIONS_LENGTH).optional(),
  locale: z.enum(["es", "en"]),
});
export type CopyPageRequestBody = z.infer<typeof CopyPageRequestBodySchema>;

/** One screen of a multi-screen request: the whole screen, or only some of its sections (block ids). */
export const CopyScreenTargetSchema = z.strictObject({
  id: z.string().min(1).max(64),
  sectionIds: SectionIdsSchema.optional(),
});

/**
 * Several screens in ONE request (Modo Layout, critique #7: one «Generar» = one free use). At most
 * `MAX_SECTION_IDS` section ids in total; a screen without `sectionIds` is sent whole.
 */
export const CopyScreensRequestBodySchema = z
  .strictObject({
    doc: z.unknown(),
    screens: z.array(CopyScreenTargetSchema).min(1).max(MAX_COPY_SCREENS),
    instructions: z.string().max(MAX_INSTRUCTIONS_LENGTH).optional(),
    locale: z.enum(["es", "en"]),
  })
  .refine((body) => body.screens.reduce((sum, screen) => sum + (screen.sectionIds?.length ?? 0), 0) <= MAX_SECTION_IDS, {
    message: `At most ${MAX_SECTION_IDS} section ids in total`,
    path: ["screens"],
  })
  .refine((body) => new Set(body.screens.map((screen) => screen.id)).size === body.screens.length, {
    message: "Each screen once",
    path: ["screens"],
  });
export type CopyScreensRequestBody = z.infer<typeof CopyScreensRequestBodySchema>;

export const CopyRequestBodySchema = z.union([CopyPageRequestBodySchema, CopyScreensRequestBodySchema]);
export type CopyRequestBody = z.infer<typeof CopyRequestBodySchema>;

export const isScreensCopyBody = (body: CopyRequestBody): body is CopyScreensRequestBody => "screens" in body;

export type CopyApiUsage = { inputTokens: number; outputTokens: number; model: string };

export type CopyApiSuccess = {
  patches: PatchOperation[];
  usage: CopyApiUsage;
  costUsd: number;
  /** Edits of the model that did not pass validation (dropped). */
  rejected: number;
  /** Field ids (`f12`) of those edits; the client maps them to sections with the same collector. */
  rejectedIds?: string[];
  /** Hosted budget left this month after this request; `null` with BYOK. */
  remainingBudgetUsd: number | null;
  /** Hosted free tier only: uses left for this device this month, after this request. */
  freeUsesRemaining?: number;
  freeUsesTotal?: number;
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
  /** The hosted free tier exists on this server (API key, persistent ledger and device secret). */
  configured: boolean;
  /** `DIALMADE_AI_MODEL`: the model for BYOK and «Copiar prompt para mi Claude». */
  model: string;
  /** Global hosted budget left this month; `null` when the hosted AI is off. */
  remainingBudgetUsd: number | null;
  /** Reservation of a typical free-tier request: below it the hosted AI can only answer 402. */
  minRequestUsd: number;
  /** Model of the hosted free tier (`DIALMADE_AI_FREE_MODEL`, or `model` when empty). */
  freeModel?: string;
  /** Free uses per device per month («3 de 5 usos gratis este mes»). */
  freeUsesTotal?: number;
  /** Free uses this device has left this month (0 when the hosted AI is off). */
  freeUsesRemaining?: number;
};

/** What GET /api/ai/status answers (the optional fields of `AiStatus` are always there). */
export type AiStatusResponse = AiStatus & { freeModel: string; freeUsesTotal: number; freeUsesRemaining: number };

export const isCopyApiErrorCode = (value: unknown): value is CopyApiErrorCode =>
  typeof value === "string" && (COPY_API_ERROR_CODES as readonly string[]).includes(value);

/**
 * Codes of the free-tier policy, shared by every hosted AI route (/api/ai/copy, /api/ai/fingerprint).
 * Kept apart from COPY_API_ERROR_CODES so the exhaustive maps over those keep compiling.
 * `free-tier-exhausted` (402): this device used its free uses this month; offer BYOK or «mi Claude».
 */
export const AI_ACCESS_ERROR_CODES = ["free-tier-exhausted"] as const;
export type AiAccessErrorCode = (typeof AI_ACCESS_ERROR_CODES)[number];
export type AiApiErrorCode = CopyApiErrorCode | AiAccessErrorCode;

/** Error body of every hosted AI route. */
export type AiApiError = Omit<CopyApiError, "code"> & {
  code: AiApiErrorCode;
  /** With `free-tier-exhausted`: always 0. */
  remaining?: number;
  freeUsesRemaining?: number;
  freeUsesTotal?: number;
};

export const isAiApiErrorCode = (value: unknown): value is AiApiErrorCode =>
  isCopyApiErrorCode(value) || (typeof value === "string" && (AI_ACCESS_ERROR_CODES as readonly string[]).includes(value));
