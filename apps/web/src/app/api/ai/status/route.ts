import { connection } from "next/server";
import { aiStatusResponse } from "@/lib/ai/access";

// Node.js runtime (the default; `runtime` cannot be set with cacheComponents).

/**
 * `{ configured, model, freeModel, freeUsesTotal, freeUsesRemaining, remainingBudgetUsd, minRequestUsd }`
 * for this device (it sets the anonymous device cookie on the first call). Read at request time: never
 * prerendered or cached.
 */
export async function GET(request: Request): Promise<Response> {
  await connection();
  return aiStatusResponse(request);
}
