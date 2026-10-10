// Server only. Cheap checks every POST /api/ai/* runs before reading the body: a third-party page must
// not be able to spend the free tier through its visitors' browsers.
import type { AiApiError } from "./api";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * `null` when the request may go on; otherwise the response to send.
 * - 415 unless `Content-Type: application/json`: a cross-site page then needs a CORS preflight, which
 *   these routes never grant (a `text/plain` no-cors POST would not).
 * - 403 when the browser says it comes from another site (`Sec-Fetch-Site: cross-site`).
 */
export function rejectForeignRequest(request: Request): Response | null {
  const type = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (type !== "application/json") {
    const body: AiApiError = { code: "invalid-request", message: "Expected Content-Type: application/json" };
    return Response.json(body, { status: 415, headers: NO_STORE });
  }
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    const body: AiApiError = { code: "invalid-request", message: "Cross-site requests are not allowed" };
    return Response.json(body, { status: 403, headers: NO_STORE });
  }
  return null;
}
