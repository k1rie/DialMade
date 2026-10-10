"use client";

import { Fragment, useId, useState } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { Switch } from "@/components/ui/Switch";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { KeyboardIcon } from "../../icons";
import { Popover } from "../../Popover";
import { useLayoutActions, useLayoutStore } from "../../useLayoutStore";

/** Keys of a shortcut row are written «Tab · Shift+Tab»: each part is one key (or combo). */
const KEY_SEPARATOR = " · ";

/**
 * Keyboard settings and reference: the switch that turns the single-key shortcuts (R, V, H, Supr, F2)
 * on and off (WCAG 2.1.4, persisted by the store) and the list of every shortcut with platform keys.
 */
export function ShortcutsMenu() {
  const t = useDictionary(layout);
  const keys = usePlatformKeys();
  const announce = useDndAnnounce();
  const actions = useLayoutActions();
  const enabled = useLayoutStore((state) => state.shortcutsEnabled);
  const [open, setOpen] = useState(false);
  const hintId = useId();
  const rows = t.shortcuts.list(keys);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t.shortcuts.title}
      align="end"
      className="w-[22rem]"
      trigger={(props) => (
        <IconButton {...props} size="sm" label={t.shortcuts.open} tooltipSide="bottom" icon={<KeyboardIcon />} />
      )}
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-small font-semibold text-fg">{t.shortcuts.title}</p>
        <div className="flex flex-col gap-1.5 rounded-control border border-app bg-white/[0.02] p-2.5">
          <Switch
            size="sm"
            checked={enabled}
            onCheckedChange={(next) => {
              actions.setShortcutsEnabled(next);
              announce(t.announce.shortcutsChanged(next));
            }}
            label={t.shortcuts.singleKey}
            aria-describedby={hintId}
          />
          <p id={hintId} className="m-0 text-caption text-muted">
            {t.shortcuts.singleKeyHint}
          </p>
        </div>
        <dl className="m-0 flex flex-col gap-1.5">
          {rows.map((row) => (
            <div key={row.action} className="flex items-start justify-between gap-3">
              <dt className="flex shrink-0 flex-wrap items-center gap-1">
                {row.keys.split(KEY_SEPARATOR).map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 && <span className="text-caption text-subtle">·</span>}
                    <Kbd>{key}</Kbd>
                  </Fragment>
                ))}
              </dt>
              <dd className="m-0 text-end text-caption text-muted">{row.action}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 text-caption text-subtle">{t.shortcuts.regionsHint}</p>
      </div>
    </Popover>
  );
}
