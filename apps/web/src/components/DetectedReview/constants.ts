/** DnD type of a detected color: role slots accept it. */
export const DETECTED_COLOR_TYPE = "detected-color";

export const slotId = (role: string) => `detected-slot-${role}`;
/** DOM id of a role slot (focus goes there after «Vaciar»). */
export const slotDomId = (role: string) => `detected-slot-box-${role}`;

/** Chips shown per group before «Ver N más». */
export const VISIBLE_CHIPS = 5;

/** Chips fly into their group with this stagger (s) and a CHIP_ENTER tween: 5 × 30 ms + 240 ms keeps the entrance ≤400 ms. */
export const CHIP_STAGGER = 0.03;
export const CHIP_STAGGER_MAX = 5;
export const CHIP_ENTER = 0.24;

/** Conflict cards shown at most. */
export const MAX_CONFLICTS = 2;

/** Base size the minis are laid out at in the preview (their native width, 8:5). */
export const PREVIEW_WIDTH = 320;
export const PREVIEW_HEIGHT = 200;
