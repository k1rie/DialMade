import type { FileRole } from "@dialmade/import";

export const FILE_ROLES: readonly FileRole[] = ["logo", "guide", "screenshot", "reference", "font"];
/** Types offered for an image and for text; anything else keeps every type. */
export const IMAGE_ROLES: readonly FileRole[] = ["logo", "screenshot", "reference"];
export const TEXT_ROLES: readonly FileRole[] = ["guide", "font", "reference"];

/** Same caps as `IMPORT_LIMITS` of @dialmade/import (entries.test.ts keeps them in step). */
export const MAX_FILES = 20;
export const MAX_IMAGES = 12;
export const PASTE_MAX_BYTES = 1024 * 1024;

/** The detector sniffs at most this much of a file: only this slice goes to the worker for detection. */
export const SNIFF_BYTES = 256 * 1024;
export const PASTE_DETECT_DELAY_MS = 300;

/** Names that make an image «Mi logo» by default (the rest are screenshots). */
export const LOGO_NAME = /logo|isotipo|imagotipo|brand-?mark|wordmark|favicon/i;
