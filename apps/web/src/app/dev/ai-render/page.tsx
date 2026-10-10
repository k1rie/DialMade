import { notFound } from "next/navigation";
import { DevAiRender } from "./DevAiRender";

/** Dev-only check of «Diseño con IA»'s plumbing: the worker (sanitize + Tailwind compile) and one island. 404 in production. */
export default function DevAiRenderPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevAiRender />;
}
