"use client";

import { Checkbox } from "../../Checkbox";
import { RadioGroup } from "../../Radio";
import { Switch } from "../../Switch";
import { GalleryDemo } from "../GalleryDemo";
import { GalleryState } from "../GalleryState";
import { useGalleryCopy } from "../useGalleryCopy";

export function SelectionDemo() {
  const copy = useGalleryCopy();
  const t = copy.selection;
  const s = copy.states;
  return (
    <>
      <GalleryDemo label={t.checkboxes}>
        <Checkbox label={t.remember} />
        <Checkbox label={t.terms} description={t.termsDescription} defaultChecked />
        <Checkbox label={t.selectAll} indeterminate />
        <Checkbox label={t.archived} disabled />
        <Checkbox label={t.mustAccept} invalid />
      </GalleryDemo>
      <GalleryDemo label={t.radios}>
        <RadioGroup
          label={t.billing}
          defaultValue="yearly"
          options={[
            { value: "monthly", label: t.monthly, description: t.monthlyDescription },
            { value: "yearly", label: t.yearly, description: t.yearlyDescription },
            { value: "enterprise", label: t.enterprise, description: t.enterpriseDescription, disabled: true },
          ]}
        />
      </GalleryDemo>
      <GalleryDemo label={t.switches}>
        <Switch label={t.emailNotifications} defaultChecked />
        <Switch label={t.compactMode} description={t.compactDescription} />
        <Switch label={t.sync} disabled defaultChecked />
        <Switch label={t.sync} size="sm" />
      </GalleryDemo>
      <GalleryDemo label={copy.buttons.states} span="full">
        <div className="dl-gallery-row" data-align="start">
          <GalleryState label={s.hover}>
            <Checkbox aria-label={`${t.remember} (${s.hover})`} previewState="hover" />
          </GalleryState>
          <GalleryState label={s.focus}>
            <Checkbox aria-label={`${t.remember} (${s.focus})`} previewState="focus" defaultChecked />
          </GalleryState>
          <GalleryState label={s.active}>
            <Checkbox aria-label={`${t.remember} (${s.active})`} previewState="active" />
          </GalleryState>
          <GalleryState label={s.checked}>
            <Checkbox aria-label={`${t.remember} (${s.checked})`} defaultChecked />
          </GalleryState>
          <GalleryState label={s.indeterminate}>
            <Checkbox aria-label={`${t.selectAll} (${s.indeterminate})`} indeterminate />
          </GalleryState>
          <GalleryState label={`${s.disabled} · ${s.checked}`}>
            <Checkbox aria-label={`${t.remember} (${s.disabled})`} disabled defaultChecked />
          </GalleryState>
          <GalleryState label={s.focus}>
            <Switch aria-label={`${t.emailNotifications} (${s.focus})`} previewState="focus" />
          </GalleryState>
          <GalleryState label={s.hover}>
            <Switch aria-label={`${t.emailNotifications} (${s.hover})`} previewState="hover" defaultChecked />
          </GalleryState>
          <GalleryState label={s.active}>
            <Switch aria-label={`${t.emailNotifications} (${s.active})`} previewState="active" />
          </GalleryState>
        </div>
      </GalleryDemo>
    </>
  );
}
