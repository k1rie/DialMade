// Dev server of the preview origin: serves dist/ (vite build) on its own port with the production headers.
//   PREVIEW_PORT (default 3611) · PREVIEW_APP_ORIGIN (default NEXT_PUBLIC_APP_URL or http://localhost:3610)
import { join } from "node:path";
import { createPreviewServer } from "./server.ts";

const port = Number(process.env.PREVIEW_PORT ?? 3611);
const appOrigin = process.env.PREVIEW_APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3610";

createPreviewServer(join(import.meta.dirname, "../dist"), appOrigin).listen(port, () =>
  console.log(`[preview] http://localhost:${port} (frame-ancestors ${new URL(appOrigin).origin})`),
);
