/**
 * Fills `{name}` slots in a dictionary template («Añadir {block}»). Templates are plain strings so
 * server components can pass them to client ones. Client modules import this file directly, not
 * `@/i18n`, so the dictionaries stay out of the client bundle.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}
