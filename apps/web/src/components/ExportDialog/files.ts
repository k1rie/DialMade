/** «Café Brisa» → «cafe-brisa». */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "dialmade";
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/**
 * Saves a file through a temporary `<a download>`. It is attached inside `container` (the open modal
 * dialog), because the rest of the page is inert while a modal is open.
 */
export function downloadFile(data: BlobPart, filename: string, type: string, container?: HTMLElement | null): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  (container ?? document.body).append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Clipboard API first; `execCommand("copy")` as a fallback (older Safari, denied permission). */
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

/** The cropped logo (blob URL owned by the flow) as bytes for the packs. */
export async function readLogo(url: string | undefined): Promise<{ bytes: Uint8Array; type: string } | undefined> {
  if (!url) return undefined;
  try {
    const blob = await (await fetch(url)).blob();
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type || "image/png" };
  } catch {
    return undefined;
  }
}
