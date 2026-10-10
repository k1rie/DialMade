import { describe, expect, it } from "vitest";
import { checkClass, colorOfClass } from "./vocabulary";

const ok = (token: string) => checkClass(token).ok;
const reason = (token: string) => {
  const check = checkClass(token);
  return check.ok ? "ok" : check.reason;
};

describe("token-only lint (spec §2.2)", () => {
  it("accepts the token vocabulary", () => {
    for (const token of [
      "bg-primary", "text-primary-foreground", "bg-primary/10", "border-border/40", "bg-brand-500", "text-neutral-600",
      "hover:bg-primary-hover", "bg-linear-to-r", "from-primary", "to-primary-hover", "text-h1", "text-display", "font-heading",
      "rounded-card", "rounded-full", "rounded-t-lg", "shadow-card", "shadow", "p-6", "px-section", "py-section", "gap-dl-3", "max-w-container",
      "@container", "@md:grid-cols-2", "@3xl:col-span-7", "focus-visible:outline-ring", "motion-safe:transition", "hover:-translate-y-0.5",
      "-rotate-2", "w-1/2", "aspect-video", "aspect-4/3", "z-10", "size-4", "tracking-tight", "leading-body", "divide-y", "divide-border",
      "ring-2", "ring-ring", "text-left", "line-clamp-2", "group", "group-hover:text-primary-text", "bg-transparent", "text-current",
    ]) {
      expect(reason(token), token).toBe("ok");
    }
  });

  it("rejects raw values, named colors and forbidden utilities", () => {
    expect(reason("bg-[#ff0000]")).toBe("arbitrary");
    expect(reason("p-[13px]")).toBe("arbitrary");
    expect(reason("bg-(--brand)")).toBe("arbitrary");
    expect(reason("bg-[url(https://evil.example/x)]")).toBe("arbitrary");
    expect(reason("text-white")).toBe("color");
    expect(reason("bg-red-500")).toBe("color");
    expect(reason("bg-gray-100")).toBe("color");
    expect(reason("!p-4")).toBe("important");
    expect(reason("p-4!")).toBe("important");
    expect(reason("dark:bg-primary")).toBe("variant");
    expect(reason("md:flex")).toBe("variant");
    expect(reason("sm:grid-cols-2")).toBe("variant");
    expect(reason("[&>p]:mt-2")).toBe("arbitrary");
    expect(reason("fixed")).toBe("position");
    expect(reason("sticky")).toBe("position");
    expect(reason("-mt-4")).toBe("negative");
    expect(reason("-top-20")).toBe("negative");
    expect(reason("z-50")).toBe("z-index");
    expect(reason("z-[999]")).toBe("arbitrary");
    expect(reason("font-[Comic_Sans]")).toBe("arbitrary");
    expect(reason("text-2xl")).toBe("color");
    expect(reason("hover:focus:active:disabled:p-4")).toBe("variant");
    expect(ok("")).toBe(false);
    expect(ok("x".repeat(80))).toBe(false);
  });

  it("reads the color of a color utility", () => {
    expect(colorOfClass("bg-primary/20")).toEqual({ prefix: "bg", color: "primary", opacity: 20 });
    expect(colorOfClass("text-muted-foreground")).toEqual({ prefix: "text", color: "muted-foreground", opacity: null });
    expect(colorOfClass("text-h1")).toBeNull();
    expect(colorOfClass("bg-red-500")).toBeNull();
  });
});
