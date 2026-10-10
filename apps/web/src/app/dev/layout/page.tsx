import { notFound } from "next/navigation";
import { DevLayoutPlayground } from "./DevLayoutPlayground";

/** Dev-only playground of the Layout step (Fase A, not wired into the flow yet). 404 in production. */
export default function DevLayoutPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevLayoutPlayground />;
}
