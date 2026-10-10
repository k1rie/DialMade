import { APP } from "./app";
import { CONVERSION } from "./conversion";
import { FEATURES } from "./features";
import { HEROES } from "./heroes";
import { PROOF } from "./proof";
import type { LibraryBlock } from "./types";

export { fitScore, selectReferences, type SelectOptions } from "./select";
export type { LibraryBlock, LibraryBlockType, LibraryFits } from "./types";

/** Every reference block, in a stable order. */
export const LIBRARY: readonly LibraryBlock[] = [...HEROES, ...FEATURES, ...PROOF, ...CONVERSION, ...APP];
