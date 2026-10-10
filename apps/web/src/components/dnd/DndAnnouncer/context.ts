"use client";

import { createContext } from "react";

/**
 * How a live region speaks: `polite` waits until the screen reader is idle (confirmations: «Calendario
 * añadido…»); `assertive` interrupts (drag feedback and errors).
 */
export type DndPoliteness = "polite" | "assertive";

/** Speaks `message` in the DnD live region of that politeness. */
export type DndAnnounce = (message: string, politeness?: DndPoliteness) => void;

export const DndAnnounceContext = createContext<((message: string, politeness: DndPoliteness) => void) | null>(null);
