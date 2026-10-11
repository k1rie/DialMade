// «Acceso completo» to the hosted AI (supabase/migrations/20261011090000_ai_full_access.sql): which models a
// full-access account may pick for «Diseño con IA» on the server's key. Pure (the render routes import it); the tab's
// choice lives in ./fullAccessModelStore.

/** Every model the hosted «Diseño con IA» can run for a full-access account, cheapest first. */
export const FULL_ACCESS_RENDER_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type FullAccessRenderModel = (typeof FULL_ACCESS_RENDER_MODELS)[number];

export const isFullAccessRenderModel = (value: unknown): value is FullAccessRenderModel =>
  typeof value === "string" && (FULL_ACCESS_RENDER_MODELS as readonly string[]).includes(value);

/** Short names for the picker («Haiku 5.5»). */
export const fullAccessModelName = (model: FullAccessRenderModel): string =>
  ({ "claude-haiku-5-5": "Haiku 5.5", "claude-sonnet-5-5": "Sonnet 5.5", "claude-opus-5-5": "Opus 5.5" })[model];
