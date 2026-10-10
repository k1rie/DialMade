"use client";

import { isMobileBehavior, type BlockId, type BlockOverride, type DerivedBreakpoint, type LayoutBlock, type LibraryBlockDef, type ScreenId } from "@dialmade/layout";
import { useId, type ChangeEvent } from "react";
import { Switch } from "@/components/ui/Switch";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { PhoneIcon, TabletIcon } from "../../icons";
import { useLayoutActions } from "../../useLayoutStore";
import { FIELD_HINT, FIELD_LABEL, FIELD_SELECT } from "../styles";

export type DeviceFieldsProps = {
  blockId: BlockId;
  block: LayoutBlock;
  def: LibraryBlockDef;
  screenId: ScreenId;
};

const DEVICES: readonly DerivedBreakpoint[] = ["tablet", "mobile"];

/**
 * «Se ve en» (tablet and mobile visibility, `responsive.<bp>.hidden`) and «En móvil» (the block's mobile
 * behavior among `def.mobileOptions`). Hiding everywhere is the eye of the header.
 */
export function DeviceFields({ blockId, block, def, screenId }: DeviceFieldsProps) {
  const t = useDictionary(layout);
  const id = useId();
  const actions = useLayoutActions();
  const hiddenEverywhere = block.hidden === true;

  const setOverride = (device: DerivedBreakpoint, override: BlockOverride) => {
    actions.updateBlock(blockId, { responsive: { ...block.responsive, [device]: override } }, screenId);
  };

  const setVisible = (device: DerivedBreakpoint, visible: boolean) => {
    const override: BlockOverride = { ...block.responsive?.[device] };
    if (visible) delete override.hidden;
    else override.hidden = true;
    setOverride(device, override);
  };

  // A behavior kept from a previous type that this type does not offer reads as the default.
  const stored = block.responsive?.mobile?.behavior;
  const behavior = stored && def.mobileOptions.includes(stored) ? stored : def.mobile;
  const mobileHidden = block.responsive?.mobile?.hidden === true;
  const onBehavior = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!isMobileBehavior(value)) return;
    const override: BlockOverride = { ...block.responsive?.mobile };
    // The default is not stored: it follows the library if it ever changes.
    if (value === def.mobile) delete override.behavior;
    else override.behavior = value;
    setOverride("mobile", override);
  };

  return (
    <div className="flex flex-col gap-3">
      {hiddenEverywhere && <p className={FIELD_HINT}>{t.inspector.hiddenEverywhere}</p>}
      <ul className="flex flex-col gap-2">
        {DEVICES.map((device) => {
          const Icon = device === "tablet" ? TabletIcon : PhoneIcon;
          return (
            <li key={device} className="flex min-h-6 items-center justify-between gap-3">
              <span aria-hidden className="flex items-center gap-2 text-small text-fg [&_svg]:size-3.5 [&_svg]:text-muted">
                <Icon />
                {t.devices[device]}
              </span>
              <Switch
                size="sm"
                checked={!hiddenEverywhere && block.responsive?.[device]?.hidden !== true}
                disabled={hiddenEverywhere}
                onCheckedChange={(visible) => setVisible(device, visible)}
                aria-label={t.inspector.deviceToggle(t.devices[device])}
              />
            </li>
          );
        })}
      </ul>
      {def.mobileOptions.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className={FIELD_LABEL}>
            {t.inspector.mobileBehavior}
          </label>
          <select
            id={id}
            value={behavior}
            onChange={onBehavior}
            disabled={hiddenEverywhere || mobileHidden}
            aria-describedby={`${id}-hint`}
            className={FIELD_SELECT}
          >
            {def.mobileOptions.map((option) => (
              <option key={option} value={option}>
                {option === def.mobile ? t.inspector.defaultOption(t.behaviors[option]) : t.behaviors[option]}
              </option>
            ))}
          </select>
          <p id={`${id}-hint`} className={FIELD_HINT}>
            {t.inspector.behaviorHint}
          </p>
        </div>
      )}
    </div>
  );
}
