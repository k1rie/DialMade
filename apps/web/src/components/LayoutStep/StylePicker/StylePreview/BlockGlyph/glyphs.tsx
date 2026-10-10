import type { CSSProperties, ReactNode } from "react";
// Relative imports only: the glyph test renders this module in vitest without the `@/` alias.
import { itemCount } from "../../previewGeometry";
import { Bar, Button, CARD, CARD_RADIUS, Dot, FILL, GLASS_CARD, INPUT_RADIUS, Input, LINE, SMALL_RADIUS, SectionTitle, TONES, chartTone, clampInt, col, pad, range, row, tint, u, ul } from "./kit";
import type { GlyphKind } from "./types";

/*
 * What every block type holds in a style preview, like an icon set of the BlockGlyph folder: a navbar is
 * a logo, links and a button; a chart, bars in --chart-1/--chart-2; a table, a header and rows… Sizes are
 * design px and adapt to the block (how many items, rows or bars fit). Decorative.
 */

/* ------------------------------------------------------------------------------------------------ */
/* Collections: the block is a band and each item a card                                            */
/* ------------------------------------------------------------------------------------------------ */

type Collection = "features" | "cards" | "pricing" | "testimonials" | "kpis" | "logos" | "gallery";

/** Narrowest item and how tall one row of items is, in design px. */
const COLLECTION: Record<Collection, { minItem: number; rowH: number; fallback: number; title: boolean; cards: boolean }> = {
  features: { minItem: 240, rowH: 180, fallback: 3, title: true, cards: true },
  cards: { minItem: 240, rowH: 220, fallback: 3, title: false, cards: true },
  pricing: { minItem: 260, rowH: 320, fallback: 3, title: true, cards: true },
  testimonials: { minItem: 260, rowH: 160, fallback: 3, title: true, cards: true },
  kpis: { minItem: 180, rowH: 96, fallback: 4, title: false, cards: true },
  logos: { minItem: 120, rowH: 40, fallback: 6, title: false, cards: false },
  gallery: { minItem: 160, rowH: 140, fallback: 6, title: false, cards: false },
};

function CollectionItem({ kind, index, total, glass }: { kind: Collection; index: number; total: number; glass: boolean }) {
  const card: CSSProperties = { ...(glass ? GLASS_CARD : CARD), ...FILL, overflow: "hidden", boxSizing: "border-box" };
  switch (kind) {
    case "kpis":
      return (
        <span style={{ ...card, ...col(10, { justifyContent: "center" }), ...pad(16) }}>
          <Bar w="46%" h={8} />
          <Bar w="58%" h={22} tone="fg" />
          <Bar w="30%" h={6} tone={chartTone(index)} />
        </span>
      );
    case "features":
      return (
        <span style={{ ...card, ...col(12), ...pad(24) }}>
          <span style={{ display: "block", flexShrink: 0, width: ul(36, 3), height: ul(36, 3), borderRadius: SMALL_RADIUS, ...tint(chartTone(index), 24) }} />
          <Bar w="62%" h={14} tone="fg" />
          <Bar w="88%" h={8} />
          <Bar w="70%" h={8} />
        </span>
      );
    case "cards":
      return (
        <span style={{ ...card, ...col(10) }}>
          <span style={{ display: "block", ...FILL, background: "var(--muted)" }} />
          <span style={{ ...col(10), ...pad(0, 16), paddingBottom: u(16) }}>
            <Bar w="72%" h={12} tone="fg" />
            <Bar w="48%" h={8} />
          </span>
        </span>
      );
    case "pricing": {
      // The middle plan is the highlighted one, as pricing tables do.
      const featured = index === Math.floor((total - 1) / 2) && total > 1;
      return (
        <span
          style={{
            ...card,
            ...col(12),
            ...pad(24),
            ...(featured && { border: "max(1px, var(--dl-border-width, 1px)) solid var(--primary)" }),
          }}
        >
          <Bar w="40%" h={10} />
          <Bar w="52%" h={28} tone="fg" />
          <span style={col(10, { ...FILL, paddingTop: u(8) })}>
            {range(4).map((line) => (
              <Bar key={line} w={`${78 - line * 9}%`} h={8} />
            ))}
          </span>
          <Button w="100%" h={40} outline={!featured} />
        </span>
      );
    }
    case "testimonials":
      return (
        <span style={{ ...card, ...col(10), ...pad(24) }}>
          <Bar w="92%" h={9} />
          <Bar w="84%" h={9} />
          <Bar w="60%" h={9} />
          <span style={row(10, { marginTop: "auto" })}>
            <Dot d={28} tone={chartTone(index)} />
            <Bar w="34%" h={10} tone="fg" />
          </span>
        </span>
      );
    case "logos":
      return (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", ...FILL }}>
          <Bar w="66%" h={22} tone="faint" />
        </span>
      );
    case "gallery":
      return <span style={{ display: "block", ...FILL, background: "var(--muted)", borderRadius: CARD_RADIUS }} />;
  }
}

function CollectionGlyph({ kind, widthPx, heightPx, count, glass }: { kind: Collection; widthPx: number; heightPx: number; count?: number; glass: boolean }) {
  const spec = COLLECTION[kind];
  const total = itemCount(kind, count, spec.fallback);
  const padY = spec.cards ? 16 : 8;
  const title = spec.title && heightPx >= 300;
  const available = heightPx - padY * 2 - (title ? 76 : 0);
  const perRow = clampInt(widthPx / spec.minItem, 1, total);
  const rows = clampInt(available / spec.rowH, 1, Math.ceil(total / perRow));
  const shown = Math.min(total, perRow * rows);
  return (
    <span style={{ ...col(24), ...FILL, ...pad(padY, spec.cards ? 0 : 16) }}>
      {title && <SectionTitle />}
      <span
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
          gridAutoRows: "minmax(0, 1fr)",
          gap: u(spec.cards ? 24 : 16),
          ...FILL,
        }}
      >
        {range(shown).map((index) => (
          <CollectionItem key={index} kind={kind} index={index} total={Math.min(total, perRow)} glass={glass} />
        ))}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------------------------------------ */
/* Content of every block type                                                                      */
/* ------------------------------------------------------------------------------------------------ */

const BAR_HEIGHTS = [0.42, 0.66, 0.5, 0.82, 0.58, 0.74, 0.46, 0.9, 0.62, 0.7, 0.54, 0.86] as const;

export type ContentProps = { widthPx: number; heightPx: number; count?: number; glass: boolean };

function Navbar({ widthPx }: ContentProps) {
  const links = clampInt(widthPx / 260, 1, 4);
  return (
    <span style={{ ...row(24), ...FILL, ...pad(0, 32) }}>
      <Dot d={24} tone="primary" />
      <Bar w={84} h={12} tone="fg" />
      <span style={FILL} />
      {range(links).map((link) => (
        <Bar key={link} w={56} h={9} />
      ))}
      <Button w={108} h={34} />
    </span>
  );
}

function SidebarContent({ widthPx, heightPx }: ContentProps) {
  const compact = widthPx < 140; // the rail: icons only
  const items = clampInt((heightPx - 96) / 52, 1, 7);
  return (
    <span style={{ ...col(16), ...FILL, ...pad(24, compact ? 0 : 20), alignItems: compact ? "center" : "stretch" }}>
      <span style={row(10, { marginBottom: u(12) })}>
        <Dot d={28} tone="primary" />
        {!compact && <Bar w={92} h={12} tone="fg" />}
      </span>
      {range(items).map((item) =>
        compact ? (
          <span key={item} style={{ display: "block", flexShrink: 0, width: ul(32, 3), height: ul(32, 3), borderRadius: SMALL_RADIUS, ...(item === 0 ? tint("primary", 22) : TONES.soft) }} />
        ) : (
          <span key={item} style={{ ...row(12, { height: ul(36, 3), flexShrink: 0, borderRadius: SMALL_RADIUS }), ...pad(0, 10), ...(item === 0 && tint("primary", 14)) }}>
            <Dot d={14} tone={item === 0 ? "primary" : "faint"} />
            <Bar w={`${64 - (item % 3) * 12}%`} h={9} tone={item === 0 ? "fg" : "muted"} />
          </span>
        ),
      )}
    </span>
  );
}

function Topnav({ widthPx }: ContentProps) {
  const links = clampInt(widthPx / 300, 1, 4);
  return (
    <span style={{ ...row(24), ...FILL, ...pad(0, 28) }}>
      <Dot d={26} tone="primary" />
      <Bar w={84} h={12} tone="fg" />
      {range(links).map((link) => (
        <Bar key={link} w={60} h={9} tone={link === 0 ? "fg" : "muted"} />
      ))}
      <span style={FILL} />
      <Dot d={30} tone="soft" />
    </span>
  );
}

function PageHeader() {
  return (
    <span style={{ ...row(16), ...FILL, ...pad(0, 32), borderBlockEnd: LINE }}>
      <span style={col(10, FILL)}>
        <Bar w={220} h={22} tone="fg" />
        <Bar w={320} h={9} />
      </span>
      <Button w={132} h={38} />
    </span>
  );
}

function Footer({ widthPx }: ContentProps) {
  const columns = clampInt(widthPx / 240, 1, 4);
  return (
    <span style={{ ...row(48, { alignItems: "flex-start" }), ...FILL, ...pad(32) }}>
      <span style={col(12, { flex: 1.4 })}>
        <span style={row(10)}>
          <Dot d={22} tone="primary" />
          <Bar w={72} h={11} tone="fg" />
        </span>
        <Bar w="70%" h={8} />
      </span>
      {range(columns).map((column) => (
        <span key={column} style={col(12, FILL)}>
          <Bar w="50%" h={9} tone="fg" />
          <Bar w="70%" h={8} />
          <Bar w="58%" h={8} />
          <Bar w="64%" h={8} />
        </span>
      ))}
    </span>
  );
}

function Hero({ widthPx }: ContentProps) {
  const narrow = widthPx < 520;
  return (
    <span style={{ ...col(18, { justifyContent: "center" }), ...FILL, ...pad(48, narrow ? 32 : 64) }}>
      <span style={col(12)}>
        <Bar w="64%" h={40} tone="fg" />
        <Bar w="46%" h={40} tone="fg" />
      </span>
      <Bar w="52%" h={13} />
      <span style={row(12, { marginTop: u(10) })}>
        <Button w={160} h={48} />
        <Button w={136} h={48} outline />
      </span>
    </span>
  );
}

function Cta() {
  return (
    <span style={{ ...col(16, { alignItems: "center", justifyContent: "center" }), ...FILL, ...pad(40) }}>
      <Bar w="48%" h={30} tone="fg" />
      <Bar w="36%" h={12} />
      <Button w={170} h={46} style={{ marginTop: u(8) }} />
    </span>
  );
}

function Banner() {
  return (
    <span style={{ ...row(16), ...FILL, ...pad(0, 24), ...tint("primary", 10) }}>
      <Dot d={16} tone="primary" />
      <Bar w="40%" h={10} tone="fg" />
      <span style={FILL} />
      <Button w={96} h={30} />
    </span>
  );
}

function Text({ heightPx }: ContentProps) {
  const lines = clampInt((heightPx - 100) / 26, 1, 6);
  return (
    <span style={{ ...col(14), ...FILL, ...pad(32) }}>
      <Bar w="42%" h={24} tone="fg" />
      {range(lines).map((line) => (
        <Bar key={line} w={line === lines - 1 ? "58%" : `${100 - (line % 3) * 5}%`} h={9} />
      ))}
    </span>
  );
}

function Faq({ heightPx }: ContentProps) {
  const items = clampInt((heightPx - 110) / 56, 1, 6);
  return (
    <span style={{ ...col(0), ...FILL, ...pad(28) }}>
      <Bar w="34%" h={22} tone="fg" style={{ marginBottom: u(18) }} />
      {range(items).map((item) => (
        <span key={item} style={{ ...row(12, { justifyContent: "space-between", flexShrink: 0 }), ...pad(18, 0), borderBlockEnd: LINE }}>
          <Bar w={`${62 - (item % 3) * 8}%`} h={10} tone="fg" />
          <Dot d={12} tone="muted" />
        </span>
      ))}
    </span>
  );
}

function Chart({ widthPx }: ContentProps) {
  const bars = clampInt(widthPx / 72, 4, 12);
  return (
    <span style={{ ...col(20), ...FILL, ...pad(24) }}>
      <span style={row(12, { justifyContent: "space-between" })}>
        <span style={col(10)}>
          <Bar w={140} h={12} tone="fg" />
          <Bar w={90} h={8} />
        </span>
        <Bar w={72} h={24} tone="soft" />
      </span>
      <span style={{ ...row(10, { alignItems: "flex-end" }), ...FILL, borderBlockEnd: LINE }}>
        {range(bars).map((bar) => (
          <span
            key={bar}
            style={{
              display: "block",
              flex: 1,
              height: `${(BAR_HEIGHTS[bar % BAR_HEIGHTS.length] ?? 0.5) * 100}%`,
              borderRadius: `${u(4)} ${u(4)} 0 0`,
              ...(bar === bars - 3 ? TONES[2] : TONES[1]),
            }}
          />
        ))}
      </span>
    </span>
  );
}

function Table({ widthPx, heightPx, count }: ContentProps) {
  const columns = clampInt(widthPx / 220, 2, 5);
  const rows = Math.min(count ?? 8, clampInt((heightPx - 44) / 44, 1, 8));
  const cells = (header: boolean) =>
    range(columns).map((cell) => (
      <span key={cell} style={{ display: "flex", ...FILL }}>
        <Bar w={header ? "46%" : cell === 0 ? "70%" : `${56 - (cell % 2) * 14}%`} h={header ? 8 : 9} tone={header ? "muted" : cell === 0 ? "fg" : "muted"} />
      </span>
    ));
  return (
    <span style={{ ...col(0), ...FILL }}>
      <span style={{ ...row(16, { height: ul(44, 3), flexShrink: 0 }), ...pad(0, 20), background: "var(--muted)" }}>{cells(true)}</span>
      {range(rows).map((line) => (
        <span key={line} style={{ ...row(16, { height: ul(44, 3), flexShrink: 0 }), ...pad(0, 20), borderBlockStart: line === 0 ? undefined : LINE }}>
          {cells(false)}
        </span>
      ))}
    </span>
  );
}

function List({ heightPx, count, variant }: ContentProps & { variant: "list" | "activity" | "notifications" | "timeline" }) {
  const rows = Math.min(count ?? 6, clampInt((heightPx - 84) / 52, 1, 6));
  return (
    <span style={{ ...col(18), ...FILL, ...pad(24) }}>
      <Bar w="34%" h={13} tone="fg" />
      <span style={{ ...col(18), ...(variant === "timeline" && { borderInlineStart: LINE, marginInlineStart: u(7), paddingInlineStart: u(16) }) }}>
        {range(rows).map((item) => (
          <span key={item} style={row(14)}>
            {variant === "notifications" ? (
              <span style={{ display: "block", flexShrink: 0, width: ul(28, 3), height: ul(28, 3), borderRadius: SMALL_RADIUS, ...tint(chartTone(item), 26) }} />
            ) : (
              <Dot d={variant === "timeline" ? 12 : 24} tone={variant === "list" ? "soft" : chartTone(item)} />
            )}
            <span style={col(8, FILL)}>
              <Bar w={`${68 - (item % 3) * 10}%`} h={10} tone="fg" />
              {variant !== "list" && <Bar w="40%" h={7} />}
            </span>
            {variant !== "timeline" && <Bar w={48} h={8} />}
          </span>
        ))}
      </span>
    </span>
  );
}

function Form({ heightPx, variant }: ContentProps & { variant: "form" | "settings" | "checkout" }) {
  const fields = clampInt((heightPx - 190) / 76, 1, variant === "form" ? 4 : 5);
  return (
    <span style={{ ...col(16), ...FILL, ...pad(32) }}>
      <span style={col(10, { marginBottom: u(8) })}>
        <Bar w="38%" h={20} tone="fg" />
        <Bar w="56%" h={9} />
      </span>
      {range(fields).map((field) => (
        <span key={field} style={col(8)}>
          <Bar w={`${24 + (field % 2) * 8}%`} h={8} />
          <Input h={40} />
        </span>
      ))}
      <span style={row(12, { marginTop: u(8), justifyContent: variant === "settings" ? "flex-end" : "flex-start" })}>
        <Button w={variant === "checkout" ? "100%" : "42%"} h={42} />
      </span>
    </span>
  );
}

function Search() {
  return (
    <span style={{ ...row(12), ...FILL, ...pad(0, 20) }}>
      <span style={{ ...row(10), flex: 2, ...pad(0, 14), height: ul(40, 3), borderRadius: INPUT_RADIUS, border: LINE }}>
        <Dot d={14} tone="muted" />
        <Bar w="40%" h={8} />
      </span>
      {range(2).map((chip) => (
        <Bar key={chip} w={88} h={32} tone="soft" />
      ))}
      <Button w={96} h={40} />
    </span>
  );
}

function Upload() {
  return (
    <span style={{ ...col(12, { alignItems: "center", justifyContent: "center" }), ...FILL, margin: u(16), borderRadius: INPUT_RADIUS, border: "max(1px, var(--dl-border-width, 1px)) dashed var(--border-strong)" }}>
      <Dot d={40} style={tint("primary", 22)} />
      <Bar w="36%" h={10} tone="fg" />
      <Bar w="24%" h={8} />
    </span>
  );
}

function Media({ widthPx, variant }: ContentProps & { variant: "media" | "video" | "map" }) {
  if (variant === "video") {
    return (
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", ...FILL }}>
        <Dot d={Math.min(72, widthPx / 5)} tone="primary" />
      </span>
    );
  }
  if (variant === "map") {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...FILL,
          backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: `${u(80)} ${u(80)}`,
        }}
      >
        <Dot d={28} tone="primary" style={{ boxShadow: `0 0 0 ${u(10)} color-mix(in oklab, var(--primary) 22%, transparent)` }} />
      </span>
    );
  }
  return (
    <span style={{ position: "relative", display: "block", ...FILL }}>
      <Dot d={Math.min(80, widthPx / 6)} tone={3} style={{ position: "absolute", top: "16%", right: "16%", opacity: 0.7 }} />
      <span style={{ position: "absolute", insetInline: 0, bottom: 0, height: "42%", ...tint(1, 30), clipPath: "polygon(0 100%, 0 45%, 28% 10%, 52% 60%, 72% 30%, 100% 70%, 100% 100%)" }} />
    </span>
  );
}

function Calendar() {
  return (
    <span style={{ ...col(16), ...FILL, ...pad(20) }}>
      <span style={row(12, { justifyContent: "space-between" })}>
        <Bar w={120} h={12} tone="fg" />
        <Bar w={64} h={20} tone="soft" />
      </span>
      <span
        style={{
          position: "relative",
          display: "block",
          ...FILL,
          border: LINE,
          borderRadius: INPUT_RADIUS,
          backgroundImage: "linear-gradient(90deg, var(--border) 1px, transparent 1px), linear-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: `calc(100% / 7) calc(100% / 5)`,
        }}
      >
        <span style={{ position: "absolute", left: `${(100 / 7) * 2}%`, top: "20%", width: `${100 / 7}%`, height: "20%", ...tint("primary", 26) }} />
        <span style={{ position: "absolute", left: `${(100 / 7) * 4}%`, top: "60%", width: `${(100 / 7) * 2}%`, height: "20%", ...tint(2, 26) }} />
      </span>
    </span>
  );
}

function Kanban({ widthPx, heightPx }: ContentProps) {
  const columns = clampInt(widthPx / 260, 2, 4);
  const cards = clampInt((heightPx - 100) / 90, 1, 3);
  return (
    <span style={{ ...row(16, { alignItems: "stretch" }), ...FILL, ...pad(20) }}>
      {range(columns).map((column) => (
        <span key={column} style={{ ...col(12), ...FILL, ...pad(14), borderRadius: SMALL_RADIUS, background: "var(--muted)" }}>
          <Bar w="50%" h={9} tone="fg" />
          {range(Math.max(1, cards - (column % 2))).map((card) => (
            <span key={card} style={{ ...col(8), ...pad(12), flexShrink: 0, borderRadius: SMALL_RADIUS, background: "var(--card)", border: LINE }}>
              <Bar w="80%" h={8} tone="fg" />
              <Bar w={40} h={6} tone={chartTone(column + card)} />
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

function Chat({ heightPx }: ContentProps) {
  const bubbles = clampInt((heightPx - 120) / 64, 1, 5);
  return (
    <span style={{ ...col(14), ...FILL, ...pad(20) }}>
      <span style={{ ...col(14), ...FILL, justifyContent: "flex-end" }}>
        {range(bubbles).map((bubble) => {
          const mine = bubble % 2 === 1;
          return (
            <span
              key={bubble}
              style={{
                display: "block",
                flexShrink: 0,
                alignSelf: mine ? "flex-end" : "flex-start",
                width: `${mine ? 46 : 58 - (bubble % 3) * 6}%`,
                height: ul(40, 3),
                borderRadius: SMALL_RADIUS,
                ...(mine ? TONES.primary : TONES.soft),
              }}
            />
          );
        })}
      </span>
      <span style={row(10)}>
        <Input h={40} />
        <Dot d={40} tone="primary" />
      </span>
    </span>
  );
}

function Profile() {
  return (
    <span style={{ ...col(16, { alignItems: "center", justifyContent: "center" }), ...FILL, ...pad(28) }}>
      <Dot d={72} style={tint(1, 40)} />
      <Bar w="40%" h={16} tone="fg" />
      <Bar w="56%" h={9} />
      <span style={row(16, { marginTop: u(6) })}>
        <Button w={110} h={34} />
        <Button w={96} h={34} outline />
      </span>
    </span>
  );
}

function Cart({ heightPx }: ContentProps) {
  const items = clampInt((heightPx - 150) / 80, 1, 4);
  return (
    <span style={{ ...col(16), ...FILL, ...pad(24) }}>
      <Bar w="30%" h={16} tone="fg" />
      {range(items).map((item) => (
        <span key={item} style={row(14)}>
          <span style={{ display: "block", flexShrink: 0, width: ul(52, 3), height: ul(52, 3), borderRadius: SMALL_RADIUS, background: "var(--muted)" }} />
          <span style={col(8, FILL)}>
            <Bar w="64%" h={10} tone="fg" />
            <Bar w="36%" h={8} />
          </span>
          <Bar w={56} h={10} tone="fg" />
        </span>
      ))}
      <Button w="100%" h={44} style={{ marginTop: "auto" }} />
    </span>
  );
}

function Tabs() {
  return (
    <span style={{ ...col(18), ...FILL, ...pad(20) }}>
      <span style={{ ...row(28), borderBlockEnd: LINE, paddingBottom: u(12) }}>
        {range(4).map((tab) => (
          <Bar key={tab} w={72} h={10} tone={tab === 0 ? "primary" : "muted"} />
        ))}
      </span>
      <Bar w="80%" h={9} />
      <Bar w="64%" h={9} />
    </span>
  );
}

function Stepper() {
  return (
    <span style={{ ...row(12), ...FILL, ...pad(0, 32) }}>
      {range(4).map((step) => (
        <span key={step} style={{ ...row(12), flex: step === 3 ? "none" : 1 }}>
          <Dot d={28} tone={step < 2 ? "primary" : "soft"} />
          {step < 3 && <span style={{ display: "block", ...FILL, height: ul(3), ...(step < 1 ? TONES.primary : TONES.faint) }} />}
        </span>
      ))}
    </span>
  );
}

function Pagination() {
  return (
    <span style={{ ...row(10, { justifyContent: "center" }), ...FILL }}>
      {range(5).map((page) => (
        <span
          key={page}
          style={{
            display: "block",
            flexShrink: 0,
            width: ul(32, 3),
            height: ul(32, 3),
            borderRadius: SMALL_RADIUS,
            ...(page === 1 ? TONES.primary : { border: LINE }),
          }}
        />
      ))}
    </span>
  );
}

function Modal() {
  return (
    <span style={{ ...col(14), ...FILL, ...pad(28) }}>
      <Bar w="52%" h={18} tone="fg" />
      <Bar w="86%" h={9} />
      <Bar w="70%" h={9} />
      <span style={row(12, { marginTop: "auto", justifyContent: "flex-end" })}>
        <Button w={96} h={36} outline />
        <Button w={110} h={36} />
      </span>
    </span>
  );
}

function Empty() {
  return (
    <span style={{ ...col(14, { alignItems: "center", justifyContent: "center" }), ...FILL, ...pad(24) }}>
      <Dot d={52} tone="soft" />
      <Bar w="32%" h={14} tone="fg" />
      <Bar w="44%" h={8} />
      <Button w={128} h={36} style={{ marginTop: u(6) }} />
    </span>
  );
}

function Generic() {
  return (
    <span style={{ ...col(12), ...FILL, ...pad(24) }}>
      <Bar w="40%" h={12} tone="fg" />
      <Bar w="70%" h={8} />
      <Bar w="56%" h={8} />
    </span>
  );
}

/** Collections paint each item as a card on a transparent band. */
export const isCollection = (kind: GlyphKind): kind is Collection => Object.hasOwn(COLLECTION, kind);

/** Inside of a glyph: what the block holds, drawn in design px. `null` for «Contenedor» (its children paint on top). */
export function glyphContent(kind: GlyphKind, props: ContentProps): ReactNode {
  if (isCollection(kind)) return <CollectionGlyph kind={kind} {...props} />;
  switch (kind) {
    case "frame-sidebar":
    case "frame-rail":
    case "sidebar":
      return <SidebarContent {...props} />;
    case "frame-topnav":
      return <Topnav {...props} />;
    case "frame-header":
      return <PageHeader />;
    case "navbar":
      return <Navbar {...props} />;
    case "footer":
      return <Footer {...props} />;
    case "hero":
      return <Hero {...props} />;
    case "cta":
      return <Cta />;
    case "banner":
      return <Banner />;
    case "text":
      return <Text {...props} />;
    case "faq":
      return <Faq {...props} />;
    case "chart":
      return <Chart {...props} />;
    case "table":
      return <Table {...props} />;
    case "list":
    case "activity":
    case "notifications":
    case "timeline":
      return <List {...props} variant={kind} />;
    case "form":
    case "settings":
    case "checkout":
      return <Form {...props} variant={kind} />;
    case "search":
      return <Search />;
    case "upload":
      return <Upload />;
    case "media":
    case "video":
    case "map":
      return <Media {...props} variant={kind} />;
    case "calendar":
      return <Calendar />;
    case "kanban":
      return <Kanban {...props} />;
    case "chat":
      return <Chat {...props} />;
    case "profile":
      return <Profile />;
    case "cart":
      return <Cart {...props} />;
    case "tabs":
      return <Tabs />;
    case "stepper":
      return <Stepper />;
    case "pagination":
      return <Pagination />;
    case "modal":
      return <Modal />;
    case "empty":
      return <Empty />;
    case "container":
      return null;
    default:
      return <Generic />;
  }
}
