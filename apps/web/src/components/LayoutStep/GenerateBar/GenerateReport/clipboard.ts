/*
 * Copy of ExportDialog's `copyText` (component-private there); Fase B can move one copy to src/lib.
 */

/**
 * Clipboard API first; `execCommand("copy")` as a fallback (older Safari, denied permission). The
 * fallback textarea goes inside `container` (the open modal dialog): the rest of the page is inert.
 */
export async function copyText(text: string, container?: HTMLElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    (container ?? document.body).append(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    area.remove();
    return copied;
  }
}
