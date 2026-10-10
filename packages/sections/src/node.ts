/// <reference types="node" />
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Paths of the built CSS bundles: @dialmade/ui's and this package's (`pnpm build:css` in each). */
export function bundledCssPaths(): { ui: string; sections: string } {
  const resolve = (specifier: string, pkg: string) => {
    try {
      return require.resolve(specifier);
    } catch {
      throw new Error(`${specifier} is missing: run \`corepack pnpm --filter ${pkg} build:css\` first.`);
    }
  };
  return {
    ui: resolve("@dialmade/ui/dialmade-ui.css", "@dialmade/ui"),
    sections: resolve("@dialmade/sections/dialmade-sections.css", "@dialmade/sections"),
  };
}

/** Kit CSS for `renderStaticPage({ css })`: dialmade-ui.css followed by dialmade-sections.css. Node only. */
export async function readBundledCss(): Promise<string> {
  const paths = bundledCssPaths();
  const [ui, sections] = await Promise.all([readFile(paths.ui, "utf8"), readFile(paths.sections, "utf8")]);
  return `${ui.trim()}\n${sections.trim()}\n`;
}
