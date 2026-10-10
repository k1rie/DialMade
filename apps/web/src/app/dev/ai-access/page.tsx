import { notFound } from "next/navigation";
import { DevAiAccess } from "./DevAiAccess";

/** Dev-only check of «Diseño con IA»'s ways in: cost lines per path, the key dialog's model, «mi Claude» → islands. 404 in production. */
export default function DevAiAccessPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevAiAccess />;
}
