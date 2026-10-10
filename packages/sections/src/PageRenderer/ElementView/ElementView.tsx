"use client";

import { memo, useMemo, type ReactNode } from "react";
import type { PageElement } from "@dialmade/doc";
import { resolveSectionProps } from "../../props";
import { sectionStrings } from "../../lib/strings";
import type { AnySectionDefinition, ContentContext, RenderContext } from "../../types";
import { isStructuralElement } from "./structural";
import { SectionBoundary } from "../SectionBoundary";
import { SectionFrame } from "../SectionFrame";
import { SectionNotice } from "../SectionNotice";
import type { RenderScope } from "../types";

export interface ElementViewProps {
  id: string;
  scope: RenderScope;
  /** The page root: never hidden nor selectable; without a registered section only its children render. */
  isRoot?: boolean;
}

/** One element of the page and, recursively, its visible children. */
export function ElementView({ id, scope, isRoot = false }: ElementViewProps) {
  const { page, ctx, registry, hidden, exclude } = scope;
  const element = page.elements[id];
  if (!element) return null;
  const skipped = hidden.has(id) || exclude?.has(id);
  if (skipped && !isRoot) return null;

  const def = skipped ? undefined : registry.get(element.type);
  const children =
    element.children.length > 0 ? element.children.map((child) => <ElementView key={child} id={child} scope={scope} />) : null;
  const strings = sectionStrings(ctx.locale);
  const label = def ? def.label[ctx.locale] : element.type;
  const structural = isStructuralElement(def, element);
  const attributes = def?.frame?.attributes?.(element.props);

  if (isRoot) {
    if (!def) return <>{children}</>;
    return (
      <SectionBoundary resetKey={element.props} fallback={children} onError={(error) => scope.onSectionError?.(id, error)}>
        <SectionContent def={def} element={element} id={id} ctx={ctx} content={scope.content}>
          {children}
        </SectionContent>
      </SectionBoundary>
    );
  }

  return (
    <SectionFrame
      id={id}
      type={element.type}
      label={label}
      ctx={ctx}
      container={def?.container === true || !def}
      structural={structural}
      selected={scope.selectedId === id}
      {...(attributes && { attributes })}
    >
      {def ? (
        <SectionBoundary
          resetKey={element.props}
          onError={(error) => scope.onSectionError?.(id, error)}
          fallback={ctx.interactive ? <SectionNotice tone="error" title={strings.sectionError(label)} hint={strings.sectionErrorHint} /> : null}
        >
          <SectionContent def={def} element={element} id={id} ctx={ctx} content={scope.content}>
            {children}
          </SectionContent>
        </SectionBoundary>
      ) : (
        <>
          {ctx.interactive && !structural && <SectionNotice tone="missing" title={strings.missingSection(element.type)} />}
          {children}
        </>
      )}
    </SectionFrame>
  );
}

interface SectionContentProps {
  def: AnySectionDefinition;
  element: PageElement;
  id: string;
  ctx: RenderContext;
  content: ContentContext;
  children: ReactNode;
}

/**
 * The section itself. Memoized on its inputs (shallow): a leaf (no children) whose element, `ctx` and content
 * did not change skips its render, so a new selection (kept out of `ctx`) or an edit that keeps the other
 * elements' objects re-renders only what changed. Containers get new children on every render and always
 * re-render; their children decide for themselves.
 */
const SectionContent = memo(function SectionContent({ def, element, id, ctx, content, children }: SectionContentProps) {
  const resolved = useMemo(() => resolveSectionProps(def, element.props, content), [def, element.props, content]);
  const Section = def.Component;
  return (
    <Section {...resolved.props} variant={resolved.variant} ctx={ctx} elementId={id}>
      {children}
    </Section>
  );
});
