import { createContext } from "react";
import type { Locale } from "@dialmade/catalog";

export const UiLocaleContext = createContext<Locale>("en");
