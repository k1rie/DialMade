import { connection } from "next/server";
import { aiStatus } from "@/lib/ai/server";

// Node.js runtime (the default; `runtime` cannot be set with cacheComponents).

/** `{ configured, model, remainingBudgetUsd }`. Read at request time: never prerendered or cached. */
export async function GET(): Promise<Response> {
  await connection();
  return Response.json(aiStatus(), { headers: { "Cache-Control": "no-store" } });
}
