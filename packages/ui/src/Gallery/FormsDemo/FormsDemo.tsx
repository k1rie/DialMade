"use client";

import { Input } from "../../Input";
import { Select } from "../../Select";
import { Textarea } from "../../Textarea";
import { GalleryDemo } from "../GalleryDemo";
import { GalleryState } from "../GalleryState";
import { useGalleryCopy } from "../useGalleryCopy";

export function FormsDemo() {
  const copy = useGalleryCopy();
  const t = copy.forms;
  const s = copy.states;
  const countries = t.countries.map((label) => ({ value: label, label }));
  const plans = t.billingOptions.map((label) => ({ value: label, label }));
  return (
    <>
      <GalleryDemo label={t.textField}>
        <Input label={t.email} type="email" placeholder={t.emailPlaceholder} hint={t.emailHint} autoComplete="off" />
        <Input label={t.search} hideLabel type="search" placeholder={t.searchPlaceholder} iconStart="search" />
      </GalleryDemo>
      <GalleryDemo label={t.textarea}>
        <Textarea label={t.message} placeholder={t.messagePlaceholder} hint={t.messageHint} rows={4} />
      </GalleryDemo>
      <GalleryDemo label={t.select}>
        <Select label={t.country} placeholder={t.countryPlaceholder} options={countries} />
        <Select label={t.billing} placeholder={t.billingPlaceholder} options={plans} error={t.billingError} />
      </GalleryDemo>
      <GalleryDemo label={t.fieldStates} span="full">
        <div className="dl-gallery-grid">
          <GalleryState label={s.default} stretch>
            <Input label={t.email} placeholder={t.emailPlaceholder} />
          </GalleryState>
          <GalleryState label={s.hover} stretch>
            <Input label={t.email} placeholder={t.emailPlaceholder} previewState="hover" />
          </GalleryState>
          <GalleryState label={s.focus} stretch>
            <Input label={t.email} placeholder={t.emailPlaceholder} previewState="focus" />
          </GalleryState>
          <GalleryState label={s.error} stretch>
            <Input label={t.username} defaultValue={t.usernameValue} error={t.usernameError} required />
          </GalleryState>
          <GalleryState label={s.disabled} stretch>
            <Input label={t.plan} defaultValue={t.planValue} disabled />
          </GalleryState>
          <GalleryState label={s.disabled} stretch>
            <Select label={t.region} options={[{ value: t.regionValue, label: t.regionValue }]} disabled />
          </GalleryState>
        </div>
      </GalleryDemo>
    </>
  );
}
