import type { DropAnimationFunction } from "@dnd-kit/dom";
import { animate } from "motion/react";
import { DND_LANDED_EVENT, prefersReducedMotion } from "@/lib/dnd";
import { snappy } from "@/lib/motion";

const MAX_FLIGHT_MS = 700;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function landed(target: Element | undefined, sourceId: string | number) {
  target?.dispatchEvent(new CustomEvent(DND_LANDED_EVENT, { detail: { sourceId } }));
}

/**
 * Replaces dnd-kit's CSS drop animation: a Motion `snappy` spring that flies the dragged element
 * into the drop target (shrinking to fit and fading), or back home when there is no target / the
 * drag was canceled. Under reduced motion it resolves immediately.
 */
export const motionDropAnimation: DropAnimationFunction = ({ source, element, feedbackElement, placeholder, translate, moved }) => {
  const operation = source.manager?.dragOperation;
  const target = operation && !operation.canceled ? operation.target : null;
  const targetElement = target?.element;
  const el = feedbackElement as HTMLElement;

  if (!moved || prefersReducedMotion() || !(el instanceof HTMLElement)) {
    landed(targetElement, source.id);
    return;
  }

  const current = el.getBoundingClientRect();
  let dx: number;
  let dy: number;
  let endScale = 1;
  const flyingIn = !!targetElement;

  if (targetElement) {
    const slot = targetElement.getBoundingClientRect();
    dx = slot.left + slot.width / 2 - (current.left + current.width / 2);
    dy = slot.top + slot.height / 2 - (current.top + current.height / 2);
    endScale = clamp(Math.min(slot.width / current.width, slot.height / current.height), 0.35, 1);
  } else {
    const home = (placeholder ?? element).getBoundingClientRect();
    dx = home.left - current.left;
    dy = home.top - current.top;
  }

  el.setAttribute("data-dnd-dropping", "");

  return new Promise<void>((resolve) => {
    let done = false;
    const timer: { safety?: ReturnType<typeof setTimeout> } = {};
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer.safety);
      el.style.removeProperty("translate");
      el.style.removeProperty("scale");
      el.removeAttribute("data-dnd-dropping");
      if (flyingIn) {
        landed(targetElement, source.id);
        // Back home (dnd-kit restores it on resolve): reappear with a short fade.
        el.style.opacity = "0";
        animate(el, { opacity: [0, 1] }, { duration: 0.18, delay: 0.04, ease: "easeOut" }).then(() => el.style.removeProperty("opacity"));
      }
      resolve();
    };

    const controls = animate(0, 1, {
      ...snappy,
      restDelta: 0.002,
      onUpdate: (p) => {
        el.style.translate = `${translate.x + dx * p}px ${translate.y + dy * p}px 0`;
        if (flyingIn) {
          el.style.scale = String(1 + (endScale - 1) * p);
          el.style.opacity = String(1 - 0.9 * clamp((p - 0.55) / 0.45, 0, 1));
        }
      },
      onComplete: finish,
    });
    // rAF pauses in hidden tabs; never leave the drag operation stuck in "dropping".
    timer.safety = setTimeout(() => {
      controls.stop();
      finish();
    }, MAX_FLIGHT_MS);
  });
};
