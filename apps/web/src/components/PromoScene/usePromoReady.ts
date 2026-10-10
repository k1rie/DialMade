"use client";

import { useEffect, useRef } from "react";
import type { PromoDictionary } from "@/i18n/promo";
import { PART_ATTRIBUTE } from "./captureCss";
import type { PartLocator } from "./parts";

declare global {
  interface Window {
    /** How long the scene may take to be ready; the capture script sets it (PROMO_TIMEOUT_MS). */
    __DIALMADE_PROMO_TIMEOUT_MS__?: number;
  }
}

/** `<html>` attributes the capture script waits for. */
export const READY_ATTRIBUTE = "data-promo-ready";
export const ERROR_ATTRIBUTE = "data-promo-error";
/** What the scene is still waiting for, updated on every check (the script reports it when it gives up). */
export const PENDING_ATTRIBUTE = "data-promo-pending";

/** The DOM must stay still this long (no node, text or attribute change) to count as painted. */
const QUIET_MS = 600;
const TICK_MS = 100;
const DEFAULT_TIMEOUT_MS = 45_000;

export type PromoReadyMessages = Pick<PromoDictionary["errors"], "timeout" | "stylesheets" | "fonts" | "images">;

type Check = { pending: string[]; error: string | null };

function timeoutMs(): number {
  const value = window.__DIALMADE_PROMO_TIMEOUT_MS__;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

const list = (items: Iterable<string>) => [...new Set(items)].join(", ");

function check(locators: Record<string, PartLocator>, failedSheets: Set<string>, messages: PromoReadyMessages): Check {
  const pending: string[] = [];
  for (const [id, locator] of Object.entries(locators)) {
    const element = locator.find(document);
    if (!element) {
      pending.push(`part:${id}`);
      continue;
    }
    if (element.getAttribute(PART_ATTRIBUTE) !== id) element.setAttribute(PART_ATTRIBUTE, id);
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) pending.push(`part:${id}:empty`);
    else if (locator.ready && !locator.ready(element)) pending.push(`part:${id}:settling`);
  }
  // Skeletons and busy regions of lazy chunks (e.g. the Palette Lab's live preview).
  if (document.querySelector('[aria-busy="true"], .animate-pulse')) pending.push("busy");
  if ([...document.images].some((image) => !image.complete)) pending.push("images");

  // The user's Google Fonts: a stylesheet or a face that fails would leave fallback fonts on the page.
  // A stylesheet that failed may still get an (empty) `sheet`: its error event is what tells.
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
  const failed = links.filter((link) => failedSheets.has(link.href));
  if (failed.length > 0) return { pending, error: messages.stylesheets(list(failed.map((link) => link.href))) };
  if (links.some((link) => !link.sheet)) pending.push("stylesheets");
  // next/font's metric fallbacks (`local("Arial")`) may be missing on a machine; they never show once loaded.
  const brokenFaces = [...document.fonts].filter((face) => face.status === "error" && !/ Fallback$/.test(face.family));
  if (brokenFaces.length > 0) return { pending, error: messages.fonts(list(brokenFaces.map((face) => `${face.family} ${face.weight} ${face.style}`))) };
  if (document.fonts.status !== "loaded") pending.push("fonts");
  return { pending, error: null };
}

/** Images with a source that cannot be decoded (e.g. a revoked blob URL): a second try tells them from a source swap. */
async function brokenImages(): Promise<string[]> {
  const images = [...document.images].filter((image) => image.getAttribute("src"));
  const decode = (image: HTMLImageElement) => image.decode().then(
    () => true,
    () => false,
  );
  const results = await Promise.all(images.map(async (image) => (await decode(image)) || (await decode(image))));
  return images.filter((_, index) => !results[index]).map((image) => image.currentSrc || image.src);
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Sets `data-promo-ready` on `<html>` once the scene is painted: every part is in the DOM (and marked with
 * `data-promo-part`), nothing is loading, images, stylesheets and `document.fonts` are done and the DOM has
 * been still for a moment. Focus is dropped so no ring shows. It sets `data-promo-error` instead when a
 * stylesheet or font fails, an image is broken, or the scene is not ready in time (with what was pending),
 * so the capture fails with a reason rather than shooting fallbacks.
 */
export function usePromoReady(enabled: boolean, locators: Record<string, PartLocator>, messages: PromoReadyMessages) {
  // Stylesheets that failed to load, heard from mount (an error event does not bubble, so it is captured).
  const failedSheets = useRef(new Set<string>());
  useEffect(() => {
    const failed = failedSheets.current;
    const onError = (event: Event) => {
      if (event.target instanceof HTMLLinkElement && event.target.rel === "stylesheet") failed.add(event.target.href);
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.removeAttribute(READY_ATTRIBUTE);
    if (!enabled) return;

    const started = performance.now();
    const limit = timeoutMs();
    let lastChange = started;
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type !== "attributes" || !record.attributeName?.startsWith("data-promo"))) {
        lastChange = performance.now();
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });

    let timer = 0;
    let active = true;
    const schedule = () => {
      timer = window.setTimeout(() => void tick(), TICK_MS);
    };
    /** A timeout keeps `data-promo-pending`, so the script can tell it from a failure. */
    const stop = (error: string, timedOut = false) => {
      if (!timedOut) html.removeAttribute(PENDING_ATTRIBUTE);
      html.setAttribute(ERROR_ATTRIBUTE, error);
    };
    const tick = async () => {
      if (!active) return;
      const now = performance.now();
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== document.body) focused.blur();
      const { pending, error } = check(locators, failedSheets.current, messages);
      if (error) return stop(error);
      if (now - lastChange < QUIET_MS) pending.push("dom");
      if (pending.length > 0) {
        html.setAttribute(PENDING_ATTRIBUTE, pending.join(", "));
        if (now - started > limit) stop(messages.timeout(pending.join(", ")), true);
        else schedule();
        return;
      }
      await document.fonts.ready;
      const broken = await brokenImages();
      if (!active) return;
      if (broken.length > 0) return stop(messages.images(list(broken)));
      await nextFrame();
      await nextFrame();
      if (!active) return;
      // Anything that moved meanwhile (a late layout pass) restarts the wait.
      const again = check(locators, failedSheets.current, messages);
      if (again.error) return stop(again.error);
      if (performance.now() - lastChange < QUIET_MS || again.pending.length > 0) {
        schedule();
        return;
      }
      html.removeAttribute(PENDING_ATTRIBUTE);
      html.setAttribute(READY_ATTRIBUTE, "");
    };
    schedule();

    return () => {
      active = false;
      window.clearTimeout(timer);
      observer.disconnect();
      html.removeAttribute(READY_ATTRIBUTE);
      html.removeAttribute(ERROR_ATTRIBUTE);
      html.removeAttribute(PENDING_ATTRIBUTE);
    };
  }, [enabled, locators, messages]);
}
