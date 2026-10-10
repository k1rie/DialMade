import {
  getScreenTemplate,
  instantiateTemplate,
  type AppNav,
  type AppShell,
  type LayoutDoc,
  type ScreenKind,
  type ScreenTemplateId,
} from "@dialmade/layout";

/*
 * Layouts of the screen templates for their thumbnails («+ Pantalla», the template picker). Ids come
 * from a counter, not from crypto, so this is safe to call during render; results are cached, so the
 * memoised thumbnails get the same objects every time.
 */

export type TemplatePreview = {
  layout: LayoutDoc;
  /** The template's navigation frame, with the app's shared navigation applied (what `addScreen` creates). */
  shell: AppShell | null;
  /** `null` for «En blanco» (the app asks web or app). */
  kind: ScreenKind | null;
};

const layouts = new Map<ScreenTemplateId, TemplatePreview>();
const previews = new Map<string, TemplatePreview>();

function baseOf(id: ScreenTemplateId): TemplatePreview {
  let base = layouts.get(id);
  if (!base) {
    let n = 0;
    // Labels are not drawn by thumbnails; the type keeps the layout valid.
    const { layout, shell, kind } = instantiateTemplate(getScreenTemplate(id), { label: (type) => type, newId: () => `${id}-${n++}` });
    base = { layout, shell, kind };
    layouts.set(id, base);
  }
  return base;
}

/**
 * The preview of a screen template. `appNav` is the navigation the project's app screens share: like
 * `addScreen`, an app template with navigation takes it (a template without navigation, like Login,
 * keeps «Ninguna»).
 */
export function templatePreview(id: ScreenTemplateId, appNav: AppNav | null = null): TemplatePreview {
  const key = `${id}|${appNav ?? ""}`;
  let preview = previews.get(key);
  if (!preview) {
    const base = baseOf(id);
    const shell = base.shell && appNav && appNav !== "none" && base.shell.nav !== "none" && base.shell.nav !== appNav ? { ...base.shell, nav: appNav } : base.shell;
    preview = shell === base.shell ? base : { ...base, shell };
    previews.set(key, preview);
  }
  return preview;
}
