import type { IslandMessage } from "@dialmade/ai-render/protocol";
import { useEffect, useRef, type RefObject } from "react";
import { acceptIslandMessage } from "./messages";

/** Messages from ONE island, filtered by `acceptIslandMessage`. */
export function useIslandMessages(frame: RefObject<HTMLIFrameElement | null>, blockId: string, onMessage: (message: IslandMessage) => void) {
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = acceptIslandMessage(event, frame.current?.contentWindow ?? null, blockId);
      if (message) handler.current(message);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [frame, blockId]);
}
