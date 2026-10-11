"use client";

// «Maqueta · Presentable · Producto final» of «Diseño con IA»: how much care a generation asks for (effort, output
// room and a quality brief, see @dialmade/ai-render's TIER_SETTINGS), never a model name. The free tier runs
// `mockup` only (user decision, 2026-10-10); the other tiers go through the user's key (with the model they chose) or
// «Copiar prompt para mi Claude». Like the BYOK model (./byokModel), the choice lives only in the tab's memory.
import { AI_RENDER_TIERS, type AiRenderTier } from "@dialmade/doc";
import { useSyncExternalStore } from "react";

export const DEFAULT_RENDER_TIER: AiRenderTier = "mockup";
/** The tiers the hosted free tier runs. */
export const FREE_RENDER_TIERS: readonly AiRenderTier[] = ["mockup"];

export const isRenderTier = (value: unknown): value is AiRenderTier => typeof value === "string" && (AI_RENDER_TIERS as readonly string[]).includes(value);

let tier: AiRenderTier = DEFAULT_RENDER_TIER;
const listeners = new Set<() => void>();

export function getRenderTier(): AiRenderTier {
  return tier;
}

export function setRenderTier(next: AiRenderTier): void {
  if (!isRenderTier(next) || next === tier) return;
  tier = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useRenderTier(): AiRenderTier {
  return useSyncExternalStore(subscribe, getRenderTier, () => DEFAULT_RENDER_TIER);
}
