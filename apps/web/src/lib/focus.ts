type FocusTarget = string | (() => HTMLElement | null | undefined);

const resolve = (target: FocusTarget) => (typeof target === "string" ? document.querySelector<HTMLElement>(target) : target());

/**
 * Moves focus after React has committed the change that removed the focused control (WCAG 2.4.3):
 * the first target that exists, is connected and is not inside an exiting (aria-hidden or inert) node
 * gets it. Targets are CSS selectors or lookups.
 */
export function focusSoon(...targets: FocusTarget[]): void {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    for (const target of targets) {
      const element = resolve(target);
      if (element?.isConnected && !element.closest("[inert], [aria-hidden='true']") && !(element as HTMLButtonElement).disabled) {
        element.focus({ preventScroll: false });
        return;
      }
    }
  });
}

/** `[data-x="value"]` with the value escaped (ids carry `:`). */
export const byData = (attribute: string, value: string) => `[data-${attribute}="${CSS.escape(value)}"]`;
