"use client";

import type { Locale } from "@dialmade/catalog";
import type { KnobDef } from "@dialmade/sections";
import { useEffect, useId, useRef, useState } from "react";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { LinkIcon } from "../../../../icons";
import { Segmented } from "../../../../Segmented";

export type KnobFieldProps = {
  knob: KnobDef;
  value: unknown;
  locale: Locale;
  /** The prop is bound to the brand (`{ bind }`): edits go to the brand text. */
  linkedLabel?: string;
  onChange: (value: unknown) => void;
  /** Continuous edits (typing, slider drags) are grouped into one undo step. */
  onBegin: () => void;
  onCommit: () => void;
  onLabel: string;
  offLabel: string;
};

const fieldLabel = "text-caption font-medium text-muted";
const control =
  "w-full rounded-control border border-app-strong bg-white/[0.03] px-2.5 text-small text-fg transition-[border-color] duration-150 " +
  "placeholder:text-subtle hover:border-white/25";

/** One declarative knob (select · toggle · slider · text) of a section, styled as app chrome. */
export function KnobField({ knob, value, locale, linkedLabel, onChange, onBegin, onCommit, onLabel, offLabel }: KnobFieldProps) {
  const id = useId();
  const label = knob.label[locale];
  // While typing, the field keeps the shape it had on focus (input or textarea) so focus is never lost.
  const [draft, setDraft] = useState<{ text: string; long: boolean } | null>(null);
  // Closing the popover (Esc, outside click) unmounts a focused field without a blur: close the batch.
  const editing = useRef(false);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(
    () => () => {
      if (editing.current) commitRef.current();
    },
    [],
  );

  if (knob.control === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3">
        <span id={id} className={fieldLabel}>
          {label}
        </span>
        <Switch size="sm" checked={value === true} onCheckedChange={onChange} aria-labelledby={id} title={value === true ? onLabel : offLabel} />
      </div>
    );
  }

  if (knob.control === "select") {
    const options = knob.options ?? [];
    const current = typeof value === "string" ? value : (options[0]?.value ?? "");
    return (
      <div className="flex flex-col gap-1.5">
        <span id={id} className={fieldLabel}>
          {label}
        </span>
        {options.length <= 3 ? (
          <Segmented
            label={label}
            layoutId={`knob-${id}`}
            size="sm"
            value={current}
            onChange={onChange}
            className="self-start"
            options={options.map((option) => ({ value: option.value, label: option.label[locale] }))}
          />
        ) : (
          <select aria-labelledby={id} value={current} onChange={(event) => onChange(event.target.value)} className={cn(control, "h-8 appearance-auto")}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[locale]}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  if (knob.control === "slider") {
    const min = knob.min ?? 0;
    const max = knob.max ?? 100;
    const number = typeof value === "number" ? value : min;
    return (
      <div className="flex flex-col gap-1">
        <span id={id} className={fieldLabel}>
          {label}
        </span>
        <div onPointerDownCapture={onBegin}>
          <Slider
            value={number}
            min={min}
            max={max}
            step={knob.step ?? 1}
            label={label}
            labelledBy={id}
            showValue
            onValueChange={onChange}
            onValueCommit={onCommit}
          />
        </div>
      </div>
    );
  }

  const stored = typeof value === "string" ? value : "";
  const text = draft?.text ?? stored;
  const long = draft?.long ?? stored.length > 48;
  const shared = {
    id,
    value: text,
    onFocus: () => {
      editing.current = true;
      onBegin();
      setDraft({ text, long });
    },
    onBlur: () => {
      editing.current = false;
      onCommit();
      setDraft(null);
    },
    onChange: (event: { target: { value: string } }) => {
      setDraft({ text: event.target.value, long });
      onChange(event.target.value);
    },
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn(fieldLabel, "flex items-center gap-1.5")}>
        {label}
        {linkedLabel && (
          <span className="inline-flex items-center gap-1 font-normal text-subtle">
            <LinkIcon aria-hidden className="size-3" />
            {linkedLabel}
          </span>
        )}
      </label>
      {long ? <textarea {...shared} rows={3} className={cn(control, "resize-y py-1.5 leading-5")} /> : <input {...shared} className={cn(control, "h-8")} />}
    </div>
  );
}
