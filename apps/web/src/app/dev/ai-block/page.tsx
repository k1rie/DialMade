import { notFound } from "next/navigation";
import { DevAiBlock } from "./DevAiBlock";

/**
 * Dev-only check of «Diseño con IA» in «Ajustar» (track B): the real Composer over a document with AI blocks (the
 * «Bloque de IA» card, «Base | IA», the redo notice) and the screen's islands wired to the document (inline text,
 * live theme). 404 in production.
 */
export default function DevAiBlockPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevAiBlock />;
}
