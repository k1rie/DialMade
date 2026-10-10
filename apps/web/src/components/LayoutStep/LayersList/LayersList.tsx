"use client";

import { getBlockDef, isLibraryBlockType, type AppNav, type LibraryBlockType } from "@dialmade/layout";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { INSPECTOR_NAME_ID, REGION_ATTR } from "../constants";
import {
  useActiveScreen,
  useLayoutActions,
  useLayoutStore,
  useScreenStructure,
  useSelectedId,
} from "../useLayoutStore";
import { LAYER_ACTION_ATTR, LAYER_KEY_ATTR, TYPEAHEAD_RESET_MS } from "./constants";
import { LayerRow, type LayerRowProps } from "./LayerRow";
import {
  ancestorKeys,
  buildLayerTree,
  expandedState,
  fallbackKey,
  focusAfterRemoval,
  isTreeNavKey,
  treeNavigation,
  typeaheadIndex,
  visibleNodes,
  type LayerNode,
  type TreeNavResult,
} from "./layersTree";

export type LayersListProps = { className?: string };

const EMPTY: ReadonlySet<string> = new Set();

/** Glyph of the navigation frame row. */
const NAV_ICON: Record<Exclude<AppNav, "none">, LibraryBlockType> = { sidebar: "sidebar", rail: "sidebar", topnav: "navbar" };

/** Everything a row shows except the focus and selection state (those change without new data). */
type RowData = Omit<LayerRowProps, "selected" | "tabbable" | "register"> & { node: LayerNode };

const withoutKeys = (set: ReadonlySet<string>, keys: readonly string[]): ReadonlySet<string> => {
  const next = new Set(set);
  for (const key of keys) next.delete(key);
  return next;
};

const withKeys = (set: ReadonlySet<string>, keys: readonly string[]): ReadonlySet<string> => new Set([...set, ...keys]);

/** Focuses the inspector's name field once it renders (it mounts when a block becomes selected). */
function focusInspectorName(frames = 4) {
  const field = document.getElementById(INSPECTOR_NAME_ID);
  if (field instanceof HTMLElement) {
    field.focus();
    if (field instanceof HTMLInputElement) field.select();
    return;
  }
  if (frames > 0) requestAnimationFrame(() => focusInspectorName(frames - 1));
}

/**
 * «Capas»: the blocks of the active screen as a WAI-ARIA treeview, in reading order (the order Tab follows
 * on the canvas and mobile stacks in), nested by container, with the app navigation frame first and the
 * overlays (modals) in a group at the end. There is no reordering: the geometry sets the order.
 *
 * Keyboard (focus moves, Enter or click selects): ↑/↓, → open / first child, ← close / parent, Home/End,
 * `*` opens the siblings, type-ahead by name. Scoped to the tree: ⌘/Ctrl+Z undo, ⇧⌘Z / Ctrl+Y redo,
 * ⌘/Ctrl+D duplicate, Esc deselects; with the single-key shortcuts on, Supr/Backspace delete (toast with
 * «Deshacer») and F2 renames in the inspector. Each act on the focused row. The eye shows or hides a
 * block with the pointer; the keyboard path is the inspector.
 */
export function LayersList({ className }: LayersListProps) {
  const t = useDictionary(layout);
  const platformKeys = usePlatformKeys();
  const actions = useLayoutActions();
  const announce = useDndAnnounce();
  const screen = useActiveScreen();
  const structure = useScreenStructure();
  const selectedId = useSelectedId();
  const shortcutsEnabled = useLayoutStore((state) => state.shortcutsEnabled);
  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const instructionsId = `${baseId}-instructions`;
  const navHintId = `${baseId}-nav`;

  const nav = screen?.kind === "app" && screen.shell && screen.shell.nav !== "none" ? screen.shell.nav : null;
  const blocks = screen?.layout.blocks;
  const tree = useMemo(() => buildLayerTree(structure, { nav: nav !== null }), [structure, nav]);

  /** Closed nodes (everything starts open). */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(EMPTY);
  /** Nodes the user just opened: their descendants fade in. */
  const [openedFrom, setOpenedFrom] = useState<ReadonlySet<string>>(EMPTY);
  /** The focused row (roving tabindex), and whether focus is in the tree. */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [focusInside, setFocusInside] = useState(false);

  // A block selected elsewhere (the canvas) is revealed inside closed containers. State adjusted while
  // rendering, keyed by block and parent: a block dropped into a closed container is revealed too, and a
  // container the user closes around the selection stays closed.
  const selectedKey = selectedId !== null && tree.nodes.get(selectedId)?.kind === "block" ? selectedId : null;
  const revealKey = selectedKey === null ? null : `${selectedKey}>${tree.nodes.get(selectedKey)?.parentKey ?? ""}`;
  const [revealed, setRevealed] = useState<string | null>(null);
  if (revealKey !== revealed) {
    setRevealed(revealKey);
    const closed = selectedKey === null ? [] : ancestorKeys(tree, selectedKey).filter((key) => collapsed.has(key));
    if (closed.length > 0) setCollapsed(withoutKeys(collapsed, closed));
  }

  const visible = useMemo(() => visibleNodes(tree, collapsed), [tree, collapsed]);
  const visibleKeys = useMemo(() => visible.map((node) => node.key), [visible]);

  const rows = useMemo<RowData[]>(
    () =>
      visible.map((node): RowData => {
        const base = { node, rowKey: node.key, kind: node.kind, level: node.level, posinset: node.posinset, setsize: node.setsize };
        const ancestors = ancestorKeys(tree, node.key);
        const animateIn = ancestors.some((key) => openedFrom.has(key));
        if (node.kind === "nav") {
          const label = t.layers.nav(nav ? t.nav[nav] : t.nav.none);
          return {
            ...base,
            icon: nav ? NAV_ICON[nav] : "sidebar",
            label,
            ariaLabel: label,
            describedBy: navHintId,
            hidden: false,
            dimmed: false,
            expanded: undefined,
            animateIn,
          };
        }
        if (node.kind === "overlays") {
          return {
            ...base,
            icon: "layers",
            label: t.layers.overlays,
            ariaLabel: t.library.category(t.layers.overlays, node.childKeys.length),
            hidden: false,
            dimmed: false,
            expanded: expandedState(node, collapsed),
            animateIn,
          };
        }
        const block = blocks?.[node.key];
        const type: LibraryBlockType = block && isLibraryBlockType(block.type) ? block.type : "free";
        const name = block?.label ?? node.key;
        const hidden = block?.hidden === true;
        const hiddenByParent = !hidden && ancestors.some((key) => blocks?.[key]?.hidden === true);
        const soon = getBlockDef(type).status === "soon";
        return {
          ...base,
          icon: type,
          label: name,
          ariaLabel: t.layers.itemLabel({
            name,
            type: t.blocks[type].name,
            count: block?.count,
            note: block?.note,
            hidden,
            hiddenByParent,
            soon,
          }),
          detail: block?.note ?? (hidden ? t.layers.hidden : hiddenByParent ? t.layers.hiddenByParent : undefined),
          countText: block?.count !== undefined ? t.canvas.count(block.count) : undefined,
          badge: soon ? t.canvas.soon : undefined,
          hidden,
          dimmed: hidden || hiddenByParent,
          expanded: expandedState(node, collapsed),
          visibilityLabel: hidden ? t.layers.show(name) : t.layers.hide(name),
          animateIn,
        };
      }),
    [visible, tree, collapsed, openedFrom, blocks, nav, navHintId, t],
  );

  const isVisibleKey = (key: string | null): key is string => key !== null && visibleKeys.includes(key);
  // In the tree the focused row is the tab stop; from outside, Tab lands on the selected block (APG).
  const tabKey =
    focusInside && isVisibleKey(activeKey)
      ? activeKey
      : isVisibleKey(selectedKey)
        ? selectedKey
        : isVisibleKey(activeKey)
          ? activeKey
          : (visibleKeys[0] ?? null);

  /* ---- Focus bookkeeping ---- */
  const rootRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const rowElements = useRef(new Map<string, HTMLLIElement>());
  /** The tree had focus last (cleared only when focus moves to another element, not when a row vanishes). */
  const ownsFocus = useRef(false);
  const lastFocused = useRef<string | null>(null);
  /** A row to focus once it renders (the copy made by ⌘D). */
  const pendingFocus = useRef<string | null>(null);
  const previousKeys = useRef<readonly string[]>([]);
  const typeahead = useRef({ text: "", at: Number.NEGATIVE_INFINITY });

  const register = useCallback((key: string, element: HTMLLIElement) => {
    rowElements.current.set(key, element);
    return () => {
      if (rowElements.current.get(key) === element) rowElements.current.delete(key);
    };
  }, []);

  const focusRow = (key: string) => rowElements.current.get(key)?.focus();
  /** A row, or the Capas area itself when the tree became empty. */
  const focusRowOrArea = useCallback((key: string | null) => {
    const row = key === null ? undefined : rowElements.current.get(key);
    if (row) row.focus();
    else rootRef.current?.closest<HTMLElement>(`[${REGION_ATTR}]`)?.focus();
  }, []);

  // Keeps keyboard users in the tree when their row vanishes from outside (undo, redo, another panel).
  useLayoutEffect(() => {
    const previous = previousKeys.current;
    previousKeys.current = visibleKeys;
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    const pendingRow = pending === null ? undefined : rowElements.current.get(pending);
    if (pendingRow) {
      pendingRow.focus();
      return;
    }
    const lost = lastFocused.current;
    if (!ownsFocus.current || lost === null || visibleKeys.includes(lost)) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    focusRowOrArea(fallbackKey(previous, visibleKeys, lost));
  }, [visibleKeys, focusRowOrArea]);

  // A block selected on the canvas scrolls into view here (keyboard focus scrolls by itself).
  useEffect(() => {
    if (selectedKey === null || treeRef.current?.contains(document.activeElement)) return;
    rowElements.current.get(selectedKey)?.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  /* ---- Actions ---- */
  const blockOf = (key: string) => screen?.layout.blocks[key] ?? null;

  const setOpen = (keys: readonly string[], open: boolean) => {
    if (keys.length === 0) return;
    if (open) {
      setCollapsed(withoutKeys(collapsed, keys));
      setOpenedFrom(new Set(keys));
    } else {
      setCollapsed(withKeys(collapsed, keys));
    }
  };

  const activate = (key: string, fromKeyboard: boolean) => {
    const node = tree.nodes.get(key);
    if (!node) return;
    if (node.kind === "overlays") {
      setOpen([key], collapsed.has(key));
      return;
    }
    if (node.kind === "nav") {
      // The navigation frame is edited in the screen panel, which shows with nothing selected.
      actions.select(null);
      if (fromKeyboard) announce(t.canvas.navFrameHint);
      return;
    }
    actions.select(key);
    if (fromKeyboard) announce(t.announce.selected(blockOf(key)?.label ?? key));
  };

  // The store's undo/redo commit an open batch first and say whether the screens changed.
  const undo = () => {
    if (actions.undo()) announce(t.announce.undone);
  };

  const redo = () => {
    if (actions.redo()) announce(t.announce.redone);
  };

  const remove = (key: string) => {
    const block = blockOf(key);
    if (!block) return;
    const next = focusAfterRemoval(tree, visible, key);
    const removed = actions.removeBlocks([key]);
    if (removed.length === 0) return;
    // «Deshacer» undoes this removal only: after any other change it says so instead of undoing that change.
    const token = actions.changeToken();
    const undoRemoval = () => {
      if (actions.undoIfLatest(token)) announce(t.announce.undone);
      else toast(t.common.undoStale);
    };
    const message = removed.length === 1 ? t.announce.removed(block.label) : t.announce.removedMany(removed.length);
    announce(message);
    toast(message, { action: { label: t.common.undo, onClick: undoRemoval } });
    focusRowOrArea(next);
  };

  const duplicate = (key: string) => {
    const block = blockOf(key);
    if (!block) return;
    const copy = actions.duplicateBlock(key);
    if (copy === null) return;
    pendingFocus.current = copy;
    announce(t.announce.duplicated(block.label));
  };

  const rename = (key: string) => {
    actions.select(key);
    focusInspectorName();
  };

  const toggleHidden = (key: string) => {
    const block = blockOf(key);
    if (!block) return;
    const hide = !block.hidden;
    if (actions.updateBlock(key, { hidden: hide }).changed) announce(hide ? t.announce.hidden(block.label) : t.announce.shown(block.label));
  };

  const applyNavigation = (result: TreeNavResult) => {
    if (result.type === "focus") focusRow(result.key);
    else if (result.type === "expand") setOpen(result.keys, true);
    else if (result.type === "collapse") setOpen([result.key], false);
  };

  const typing = (at: number) => typeahead.current.text !== "" && at - typeahead.current.at <= TYPEAHEAD_RESET_MS;

  const typeAhead = (key: string, char: string, at: number) => {
    const text = typing(at) ? typeahead.current.text + char : char;
    typeahead.current = { text, at };
    const index = typeaheadIndex(
      rows.map((row) => row.label),
      visibleKeys.indexOf(key),
      text,
    );
    const match = index >= 0 ? visibleKeys[index] : undefined;
    if (match !== undefined) focusRow(match);
  };

  /* ---- Events (delegated: one set of handlers for every row) ---- */
  const rowOf = (target: EventTarget) => {
    const row = target instanceof Element ? target.closest<HTMLElement>(`[${LAYER_KEY_ATTR}]`) : null;
    const key = row?.getAttribute(LAYER_KEY_ATTR);
    return row && key ? { row, key } : null;
  };
  const actionOf = (target: EventTarget) =>
    target instanceof Element ? (target.closest(`[${LAYER_ACTION_ATTR}]`)?.getAttribute(LAYER_ACTION_ATTR) ?? null) : null;

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.defaultPrevented) return;
    const hit = rowOf(event.target);
    if (!hit) return;
    const { row, key } = hit;
    const kind = tree.nodes.get(key)?.kind;
    const lower = event.key.toLowerCase();

    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      if (lower === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (lower === "y" && event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        redo();
      } else if (lower === "d" && !event.shiftKey) {
        event.preventDefault();
        if (kind === "block") duplicate(key);
      }
      return;
    }
    // Other combinations, and keys typed on a row's own control (the eye), are not the tree's.
    if (event.altKey || event.ctrlKey || event.metaKey || event.target !== row) return;

    if (isTreeNavKey(event.key)) {
      event.preventDefault();
      typeahead.current = { text: "", at: Number.NEGATIVE_INFINITY };
      applyNavigation(treeNavigation(tree, visible, collapsed, key, event.key));
      return;
    }
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        activate(key, true);
        return;
      case " ":
        // Part of a name while typing ahead («Barra lateral»); otherwise it selects, like Enter.
        event.preventDefault();
        if (typing(event.timeStamp)) typeAhead(key, " ", event.timeStamp);
        else activate(key, true);
        return;
      case "Delete":
      case "Backspace":
        if (!shortcutsEnabled || kind !== "block") return;
        event.preventDefault();
        remove(key);
        return;
      case "F2":
        if (!shortcutsEnabled || kind !== "block") return;
        event.preventDefault();
        rename(key);
        return;
      case "Escape":
        if (typeahead.current.text !== "") {
          event.preventDefault();
          typeahead.current = { text: "", at: Number.NEGATIVE_INFINITY };
          return;
        }
        if (selectedKey === null) return;
        event.preventDefault();
        actions.select(null);
        announce(t.announce.deselected);
        return;
    }
    if (event.key.length === 1 && event.key.trim() !== "") {
      event.preventDefault();
      typeAhead(key, event.key, event.timeStamp);
    }
  };

  const onClick = (event: MouseEvent<HTMLUListElement>) => {
    const hit = rowOf(event.target);
    if (!hit) return;
    const action = actionOf(event.target);
    if (action === "visibility") {
      toggleHidden(hit.key);
      hit.row.focus();
    } else if (action === "toggle") {
      setOpen([hit.key], collapsed.has(hit.key));
    } else {
      activate(hit.key, false);
    }
  };

  const onDoubleClick = (event: MouseEvent<HTMLUListElement>) => {
    const hit = rowOf(event.target);
    if (!hit || actionOf(event.target) !== null || tree.nodes.get(hit.key)?.kind !== "block") return;
    rename(hit.key);
  };

  const onFocus = (event: FocusEvent<HTMLUListElement>) => {
    ownsFocus.current = true;
    setFocusInside(true);
    const key = event.target.getAttribute(LAYER_KEY_ATTR);
    if (key !== null) {
      lastFocused.current = key;
      setActiveKey(key);
    }
  };

  const onBlur = (event: FocusEvent<HTMLUListElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFocusInside(false);
    // A row that vanished blurs with no next element: keep ownership so the tree can take focus back.
    if (next !== null) ownsFocus.current = false;
  };

  const hasBlocks = (structure?.order.length ?? 0) > 0;
  const describedBy = [hasBlocks ? hintId : null, instructionsId].filter(Boolean).join(" ");

  return (
    <div ref={rootRef} className={cn("flex min-h-0 flex-col gap-2", className)}>
      {hasBlocks && (
        <p id={hintId} className="px-1 text-caption text-muted">
          {t.layers.hint}
        </p>
      )}
      <p id={instructionsId} className="sr-only">
        {t.layers.instructions(platformKeys, shortcutsEnabled)}
      </p>
      {nav && (
        <p id={navHintId} className="sr-only">
          {t.canvas.navFrameHint}
        </p>
      )}
      {screen && rows.length > 0 && (
        <ul
          ref={treeRef}
          role="tree"
          aria-label={t.layers.tree(screen.name)}
          aria-describedby={describedBy}
          onKeyDown={onKeyDown}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onFocus={onFocus}
          onBlur={onBlur}
          className="flex flex-col gap-px"
        >
          {rows.map(({ node, ...row }) => (
            <LayerRow key={node.key} {...row} selected={node.key === selectedKey} tabbable={node.key === tabKey} register={register} />
          ))}
        </ul>
      )}
      {!hasBlocks && <p className="px-1 text-small text-muted">{t.layers.empty}</p>}
    </div>
  );
}
