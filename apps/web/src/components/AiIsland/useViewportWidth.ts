import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

/** The app window's width (what `vw` means for the page around the islands); 1280 on the server. */
export const useViewportWidth = (): number => useSyncExternalStore(subscribe, () => window.innerWidth, () => 1280);
