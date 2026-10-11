import { createContext, useContext, type ReactNode } from "react";

/**
 * «Diseño con IA»: what paints the app frame's pieces instead of the base ones (`shell-nav`, its sidebar or rail;
 * `shell-bar`, its top bar). The frame is a container (its widgets live inside it), so it cannot be replaced whole:
 * it reads its pieces here and keeps its children.
 */
export const AiChromeContext = createContext<ReadonlyMap<string, ReactNode> | undefined>(undefined);

/** The AI piece that paints `id` in the frame, if any. */
export const useAiChrome = (id: string): ReactNode | undefined => useContext(AiChromeContext)?.get(id);
