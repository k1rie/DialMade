"use client";

import { MAX_STYLE_LENGTH, MAX_STYLE_REFERENCES } from "@dialmade/ai-render";
import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import type { StyleReference } from "@/lib/ai/render/generation";
import { prepareVisionImages } from "@/lib/ai/vision/image";
import { CloseIcon, ImageIcon } from "../../../icons";
import { appendReferences, referenceId, roomFor } from "./referenceList";

export type AiStyleBriefProps = {
  style: string;
  onStyleChange: (style: string) => void;
  references: StyleReference[];
  onReferencesChange: (references: StyleReference[]) => void;
};

const imagesOf = (files: Iterable<File>) => [...files].filter((file) => file.type.startsWith("image/"));

/**
 * «Estilo» of «Diseño con IA»: the developer's words for the look and up to 3 reference screenshots. The screenshots
 * are re-encoded in the browser, sent once with the art direction and dropped (the model keeps a note of what it took
 * from them): they are never written to the document or to storage. Attach by button, paste or drop.
 */
export function AiStyleBrief({ style, onStyleChange, references, onReferencesChange }: AiStyleBriefProps) {
  const t = useDictionary(aiText).aiRender.style;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);
  const [reading, setReading] = useState(false);
  const room = roomFor(references, MAX_STYLE_REFERENCES);
  // What is attached NOW: reading a file takes a moment, and a paste, a drop or a removal can land meanwhile.
  const latest = useRef(references);
  useEffect(() => {
    latest.current = references;
  }, [references]);

  const add = async (files: File[]) => {
    const picked = files.slice(0, roomFor(latest.current, MAX_STYLE_REFERENCES));
    if (picked.length === 0) return;
    setFailed(false);
    setReading(true);
    try {
      // One by one: each screenshot gets the full per-image budget (the route's cap allows 3 of them).
      const added: StyleReference[] = [];
      for (const file of picked) {
        const [image] = await prepareVisionImages([file]);
        if (image) added.push({ id: referenceId(), name: file.name, mediaType: image.mediaType, data: image.data });
      }
      const next = appendReferences(latest.current, added, MAX_STYLE_REFERENCES);
      latest.current = next;
      onReferencesChange(next);
    } catch {
      setFailed(true);
    } finally {
      setReading(false);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = imagesOf(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    void add(files);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const files = imagesOf(event.dataTransfer.files);
    if (files.length === 0) return;
    event.preventDefault();
    void add(files);
  };

  return (
    <div className="flex flex-col gap-1.5" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <label htmlFor={`${id}-text`} className="m-0 text-caption font-medium text-fg">
        {t.label} <span className="font-normal text-muted">· {t.optional}</span>
      </label>
      <textarea
        id={`${id}-text`}
        value={style}
        maxLength={MAX_STYLE_LENGTH}
        rows={2}
        placeholder={t.placeholder}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onStyleChange(event.target.value)}
        onPaste={onPaste}
        className="resize-none rounded-control border border-app-strong bg-white/[0.03] px-2.5 py-1.5 text-small text-fg placeholder:text-muted"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {references.map((reference, index) => {
          const name = reference.name || t.reference(index + 1);
          return (
            <div key={reference.id} className="relative size-10 overflow-hidden rounded-control border border-app-strong">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
              <img src={`data:${reference.mediaType};base64,${reference.data}`} alt={name} className="size-full object-cover" />
              <button
                type="button"
                aria-label={t.remove(name)}
                onClick={() => onReferencesChange(references.filter((other) => other.id !== reference.id))}
                className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white [&_svg]:size-2.5"
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
        {room > 0 && (
          <Button size="sm" variant="ghost" loading={reading} leadingIcon={<ImageIcon />} onClick={() => input.current?.click()} className="px-2">
            {t.attach}
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void add(imagesOf(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      <p id={`${id}-hint`} role={failed ? "alert" : undefined} className="m-0 text-caption text-muted">
        {failed ? t.failed : room === 0 ? `${t.full(MAX_STYLE_REFERENCES)} ${t.hint}` : t.hint}
      </p>
    </div>
  );
}
