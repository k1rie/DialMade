"use client";

import { createContext } from "react";

export const DndAnnounceContext = createContext<((message: string) => void) | null>(null);
