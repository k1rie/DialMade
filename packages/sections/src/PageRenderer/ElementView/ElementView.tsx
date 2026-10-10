"use client";

import { useMemo, type ReactNode } from "react";
import type { PageElement } from "@dialmade/doc";
import { resolveSectionProps } from "../../props";
import { sectionStrings } from "../../lib/strings";
import type { AnySectionDefinition } from "../../types";
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

  if (isRoot) {
    if (!def) return <>{children}</>;
    return (
      <SectionBoundary resetKey={element.props} fallback={children} onError={(error) => scope.onSectionError?.(id, error)}>
        <SectionContent def={def} element={element} id={id} scope={scope}>
          {children}
        </SectionContent>
      </SectionBoundary>
    );
  }

  return (
    <SectionFrame id={id} type={element.type} label={label} ctx={ctx} container={def?.container === true || !def}>
      {def ? (
        <SectionBoundary
          resetKey={element.props}
          onError={(error) => scope.onSectionError?.(id, error)}
          fallback={ctx.interactive ? <SectionNotice tone="error" title={strings.sectionError(label)} hint={strings.sectionErrorHint} /> : null}
        >
          <SectionContent def={def} element={element} id={id} scope={scope}>
            {children}
          </SectionContent>
        </SectionBoundary>
      ) : (
        <>
          {ctx.interactive && <SectionNotice tone="missing" title={strings.missingSection(element.type)} />}
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
  scope: RenderScope;
  children: ReactNode;
}

function SectionContent({ def, element, id, scope, children }: SectionContentProps) {
  const { content, ctx } = scope;
  const resolved = useMemo(() => resolveSectionProps(def, element.props, content), [def, element.props, content]);
  const Section = def.Component;
  return (
    <Section {...resolved.props} variant={resolved.variant} ctx={ctx} elementId={id}>
      {children}
    </Section>
  );
}
