// «Mis diseños»: GET lists the signed-in user's designs, POST saves a new one. See lib/designs/handlers.ts.
import { connection } from "next/server";
import { designsUnavailable, getDesignsHandlers } from "@/lib/designs/server";

export async function GET(request: Request) {
  await connection();
  const handlers = getDesignsHandlers();
  return handlers ? handlers.list(request) : designsUnavailable();
}

export async function POST(request: Request) {
  const handlers = getDesignsHandlers();
  return handlers ? handlers.create(request) : designsUnavailable();
}
