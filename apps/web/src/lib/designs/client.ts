"use client";

// Browser side of /api/designs. JSON only, same origin, no-store. Errors come back as `DesignsApiError`.
import type { DesignDoc } from "@dialmade/doc";
import type { DesignPreview } from "@/lib/db/schema";
import type { DesignsError, DesignsErrorCode } from "./handlers";

export type DesignSummary = {
  id: string;
  name: string;
  preview: DesignPreview;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export type DesignWithDoc = DesignSummary & { doc: DesignDoc };

export type DesignList = { designs: DesignSummary[]; max: number; anonymous: boolean };

export class DesignsApiError extends Error {
  override readonly name = "DesignsApiError";
  constructor(
    readonly status: number,
    readonly code: DesignsErrorCode | "network",
    readonly max?: number,
  ) {
    super(code);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new DesignsApiError(0, "network");
  }
  if (response.ok) return (await response.json()) as T;
  const body = (await response.json().catch(() => null)) as DesignsError | null;
  throw new DesignsApiError(response.status, body?.code ?? "unavailable", body?.max);
}

export const designsApi = {
  list: (options: { query?: string; sort?: "recent" | "name"; signal?: AbortSignal } = {}) => {
    const params = new URLSearchParams();
    if (options.query) params.set("q", options.query);
    if (options.sort && options.sort !== "recent") params.set("sort", options.sort);
    const search = params.size > 0 ? `?${params}` : "";
    return call<DesignList>(`/api/designs${search}`, { signal: options.signal });
  },
  get: (id: string, signal?: AbortSignal) => call<{ design: DesignWithDoc }>(`/api/designs/${encodeURIComponent(id)}`, { signal }).then((r) => r.design),
  create: (name: string, doc: DesignDoc) => call<{ design: DesignSummary }>("/api/designs", { method: "POST", body: { name, doc } }).then((r) => r.design),
  update: (id: string, changes: { name?: string; doc?: DesignDoc }) =>
    call<{ design: DesignSummary }>(`/api/designs/${encodeURIComponent(id)}`, { method: "PATCH", body: changes }).then((r) => r.design),
  duplicate: (id: string, name: string) =>
    call<{ design: DesignSummary }>(`/api/designs/${encodeURIComponent(id)}/duplicate`, { method: "POST", body: { name } }).then((r) => r.design),
  remove: (id: string) => call<{ ok: true }>(`/api/designs/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
