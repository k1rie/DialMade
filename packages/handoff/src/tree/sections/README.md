# Section builders

One builder per section type of `@dialmade/sections`. A builder turns the props a section renders with into a
**design tree** (`../types.ts`): nested auto layout boxes that `toFigmaPlan` turns into Figma frames and `toTsx`
into React + Tailwind v4. The React component and its CSS in `packages/sections/src/<family>/<Section>/` are the
source of truth: the tree mirrors their structure, copy, order, variants and sizes at desktop width (1440 px).

## Contract

```ts
const heroBuilder: SectionBuilder = ({ id, props, variant, children, ctx, build }) => FrameNode;
```

- `props` are already resolved (`resolveSectionProps`): defaults merged, bindings resolved, validated. Respect the
  same rules the component does (`count`, flags that hide copy, empty strings that disappear).
- `ctx` is the section's `RenderContext`: call the same content helpers the component calls (`tableData(ctx)`,
  chart series…). Links: `ctx.linkTarget?.(id)` is the screen the element's primary action opens; a nav item's
  `linkTo` (a screen id) goes straight to `linkTo` on the box. Put `linkTo` on the clickable box (a button).
- `children` are the built child elements of containers (`app.shell`, `ui.region` groups): place them where the
  component renders `{children}`.
- `build` has the tokens of both modes (`build.light`, `build.dark`) and `build.inputs` (theme, recipe, pairing):
  the brand board shows real values (hex, font names) as **text**, but every paint stays a color variable.
- Return the section's root box with `width: "fill"`. The walker sets its `key` and default name.

## Rules

- Only theme references: colors are contract variables without `--` (`primary`, `muted-foreground`,
  `color-brand-500`), spacing is a step of `--dl-space-*` (`5` = 24 px), radii and shadows are token names
  (`card`, `button`, `md`). Literal px only where the CSS uses literal px (icon sizes, fixed widths, bars).
  `color-mix(...)` in CSS becomes a color with `opacity`.
- Use the helpers of `../nodes.ts` (`column`, `row`, `grid`, `text`, `button`, `badge`, `card`, `field`, `image`,
  `icon`, `dot`, `divider`): they mirror `dl-button`, `dl-badge`, `dl-card`, `dl-input` of `@dialmade/ui`.
- Defaults: a box or text is `fill` in a column and `hug` in a row; height hugs. Use `width: "fill"` for children
  that share a row equally and `grid({ columns })` for card grids (cells of equal width, rows wrap).
- Text styles (`../../textStyles.ts`): `display`, `h1`–`h3`, `lead` (subtitles, body × 1.0625), `body`,
  `body-strong`, `small`, `small-strong`, `caption`, `caption-strong`, `overline`, `button*`, `mono`.
- Give boxes a semantic `tag` when the component uses one (`header`, `nav`, `ul`/`li`, `form`, `table`…) and a
  `label` to images and charts: the TSX export uses them.
- Images, photos and illustrations are `image()` placeholders (or shapes); charts are bars/lines drawn with shapes.
- Deterministic: no `Math.random`, no dates; use the component's seeded helpers.
- No new dependencies. Keep each builder in `<family>/<name>.ts`, exported through `<family>/index.ts`.
