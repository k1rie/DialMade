// Imported FIRST by the runtime: zod decides at schema construction whether it may compile parsers with
// `new Function` (and probes for it), so `jitless` must be set before ../protocol builds its schemas. The island's CSP
// (Trusted Types, no unsafe-eval) forbids eval anyway; without this the probe still logs a policy violation.
import { z } from "zod";

z.config({ jitless: true });
