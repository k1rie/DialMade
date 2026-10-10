import { AiCopyError } from "@/hooks/useAiCopy";

/**
 * Whether a failed «Escribir con IA» opens the AI menu, which offers the user's own key and «mi Claude»: no free
 * uses, budget spent or daily limit (`fallback`), a rejected key, AI off on this server, and a design too large for
 * the hosted route (its 1 MB body limit: with the user's key the browser calls Anthropic directly, and «mi Claude»
 * never goes through it). Other errors (network, refused…) only show their toast.
 */
export function opensAiMenu(error: unknown): boolean {
  if (!(error instanceof AiCopyError)) return false;
  if (error.fallback !== null || error.code === "budget-exceeded") return true;
  return error.reason === "invalid-key" || error.reason === "ai-not-configured" || error.reason === "payload-too-large";
}
