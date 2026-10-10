import { describe, expect, it } from "vitest";
import { relativeTime } from "./relativeTime";

describe("relativeTime", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  it("speaks both locales", () => {
    expect(relativeTime("2026-10-10T11:55:00Z", "en", now)).toBe("5 minutes ago");
    expect(relativeTime("2026-10-10T11:55:00Z", "es", now)).toBe("hace 5 minutos");
    expect(relativeTime("2026-10-09T12:00:00Z", "es", now)).toBe("ayer");
    expect(relativeTime("2026-08-10T12:00:00Z", "en", now)).toBe("2 months ago");
  });
});
