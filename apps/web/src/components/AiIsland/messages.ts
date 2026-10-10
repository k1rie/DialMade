import { IslandMessageSchema, type IslandMessage } from "@dialmade/ai-render/protocol";

/**
 * A message the app accepts from ONE island (spec §6.1 [C6]): sent by that iframe's window (`event.source`; the
 * sandboxed document has an opaque origin, so `event.origin` is "null" and proves nothing), valid against the shared
 * schema, and about its own block (`ready` and `error` carry no id). Anything else is `null`.
 */
export function acceptIslandMessage(event: { source: unknown; data: unknown }, frameWindow: unknown, blockId: string): IslandMessage | null {
  if (!frameWindow || event.source !== frameWindow) return null;
  const parsed = IslandMessageSchema.safeParse(event.data);
  if (!parsed.success) return null;
  const message = parsed.data;
  if ("blockId" in message && message.blockId !== blockId) return null;
  return message;
}
