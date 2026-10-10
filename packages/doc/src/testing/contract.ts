import { SCALE_STEPS } from "@dialmade/palette";
import { COMPONENT_VARS, THEME_CONTRACT_VARS, TOKEN_VARS } from "@dialmade/ui/contract";

// The theme CSS-variable contract lives in @dialmade/ui (its consumer); doc's tests check that the
// compiled theme emits all of it.
export const SCALE_VARS = ["brand", "cta", "neutral", "success", "warning", "error", "info"].flatMap((scale) =>
  SCALE_STEPS.map((step) => `--color-${scale}-${step}`),
);

export const NON_COLOR_VARS: readonly string[] = TOKEN_VARS;

export { COMPONENT_VARS };

export const CONTRACT_VARS: readonly string[] = [...THEME_CONTRACT_VARS, ...SCALE_VARS];
