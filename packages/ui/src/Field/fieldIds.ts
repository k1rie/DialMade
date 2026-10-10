export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error`, label: `${id}-label` };
}

/** `aria-describedby` de un control: pista y error, en ese orden. */
export function describedBy(id: string, hasHint: boolean, hasError: boolean, extra?: string): string | undefined {
  const ids = fieldIds(id);
  const value = [extra, hasHint && ids.hint, hasError && ids.error].filter(Boolean).join(" ");
  return value || undefined;
}

export function isPresent(node: unknown): boolean {
  return node != null && node !== false && node !== "";
}
