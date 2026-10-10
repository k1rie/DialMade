import { SCREEN_TEMPLATES, validateLayout } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { templatePreview } from "./templatePreview";

describe("templatePreview", () => {
  it("builds every screen template without crypto and caches it", () => {
    for (const template of SCREEN_TEMPLATES) {
      const preview = templatePreview(template.id);
      expect(Object.keys(preview.layout.blocks)).toHaveLength(template.blocks.length);
      expect(preview.kind).toBe(template.kind);
      expect(templatePreview(template.id)).toBe(preview);
    }
  });

  it("produces layouts the engine accepts", () => {
    for (const template of SCREEN_TEMPLATES) {
      const issues = validateLayout(templatePreview(template.id).layout);
      expect(issues, template.id).toEqual([]);
    }
  });

  it("shows the app's shared navigation on app templates that have navigation, like addScreen", () => {
    const dashboard = templatePreview("dashboard", "topnav");
    expect(dashboard.shell?.nav).toBe("topnav");
    expect(dashboard.layout).toBe(templatePreview("dashboard").layout);
    expect(templatePreview("dashboard", "topnav")).toBe(dashboard);
    // Login has no navigation and keeps it; landing templates have no shell at all.
    expect(templatePreview("login", "topnav").shell?.nav).toBe("none");
    expect(templatePreview("home", "topnav").shell).toBeNull();
    expect(templatePreview("dashboard", null).shell?.nav).toBe("sidebar");
  });
});
