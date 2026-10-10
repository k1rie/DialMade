import { expect } from "vitest";

/** Every DOM id is unique and every ARIA id reference points to an element. */
export function idsAreUnique(container: HTMLElement) {
  const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
  expect(ids.length - new Set(ids).size, "ids duplicados").toBe(0);
  for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
    for (const el of container.querySelectorAll(`[${attr}]`)) {
      for (const ref of (el.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
        expect(container.querySelector(`[id="${ref}"]`), `${attr}="${ref}"`).toBeTruthy();
      }
    }
  }
}

/** Accessible basics a screen reader needs: named controls, images, links and buttons. */
export function a11yBasics(container: HTMLElement) {
  for (const control of container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")) {
    const named = (control.labels?.length ?? 0) > 0 || control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby");
    expect(named, `${control.outerHTML} sin etiqueta`).toBe(true);
  }
  for (const img of container.querySelectorAll("[role='img']")) {
    expect(img.getAttribute("aria-label")?.trim(), "role=img sin aria-label").toBeTruthy();
  }
  for (const img of container.querySelectorAll("img")) expect(img.hasAttribute("alt"), "img sin alt").toBe(true);
  for (const link of container.querySelectorAll("a")) {
    expect(link.getAttribute("href"), "enlace sin href").toBeTruthy();
    expect(link.textContent?.trim(), "enlace sin texto").toBeTruthy();
    if (link.getAttribute("target") === "_blank") expect(link.getAttribute("rel")).toContain("noopener");
  }
  for (const button of container.querySelectorAll("button")) expect(button.textContent?.trim(), "botón sin nombre").toBeTruthy();
}
