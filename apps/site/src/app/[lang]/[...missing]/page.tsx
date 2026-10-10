import { notFound } from "next/navigation";

/** Not a real destination, so there is no navigation to validate as instant. */
export const instant = false;

/** Any unknown path under a language (/es/nope) lands on `[lang]/not-found.tsx`, inside the styled layout. */
export default function Missing() {
  notFound();
}
