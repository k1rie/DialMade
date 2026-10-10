import type { CopyApiErrorCode } from "./api";

export type AiOutputErrorCode = Extract<CopyApiErrorCode, "refused" | "invalid-response">;

/**
 * The model answered, but not with usable output (refusal, cut or invalid JSON). `response` is set when
 * the response, and so its cost, is known: the hosted ledger then settles that real cost.
 * Any hosted AI feature (copy, fingerprint) throws it, or a subclass, from its `run`.
 */
export class AiOutputError extends Error {
  constructor(
    readonly code: AiOutputErrorCode,
    message: string,
    readonly response?: { model: string; costUsd: number },
  ) {
    super(message);
    this.name = "AiOutputError";
  }
}
