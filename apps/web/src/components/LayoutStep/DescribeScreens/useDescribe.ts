"use client";

// State of «Describe tu producto»: the request (hosted free tier or BYOK, ONE free use for every variant), «Sin IA»
// (the deterministic fallback, free), «Copiar prompt para mi Claude» (the same request, the pasted JSON validated
// with the same Zod) and applying the chosen variant as ONE undo step of the layout, with its style.
import type { LayoutBrief } from "@dialmade/doc";
import { GENERIC_PRODUCT_ID, getStyleRecipe } from "@dialmade/catalog";
import { useCallback, useEffect, useRef, useState } from "react";
import { docHasDesign, useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { locales, useDictionary, useI18n } from "@/i18n";
import { flow as flowText } from "@/i18n/flow";
import { layout as layoutText, type DescribeKind } from "@/i18n/layout";
import type { ProposeRequestBody } from "@/lib/ai/layout/api";
import { LAYOUT_MAX_EXISTING, MIN_DESCRIPTION_LENGTH, PROPOSAL_BLOCK_TYPES } from "@/lib/ai/layout/constants";
import { normalizeDetails, normalizeProposals, type LayoutProposal, type ProposalDetails } from "@/lib/ai/layout/normalize";
import { cleanDescription } from "@/lib/ai/layout/prompt";
import type { AiFallbackReason } from "@/lib/ai/policy";
import { searchBlocks } from "../searchBlocks";
import type { ProposalMode } from "../useLayoutStore";
import { useLayoutActions, useLayoutEnv, useLayoutStoreApi } from "../useLayoutStore";
import { LayoutAiError, useLayoutAi, useLayoutAiDialog, type LayoutAiResult } from "../useLayoutAi";
import { fallbackAnswer } from "./fallback";

/** Who proposed the variants on screen. */
export type DescribeBy = LayoutBrief["source"];

export type DescribePhase =
  | { kind: "idle" }
  | { kind: "proposing"; spends: boolean }
  | {
      kind: "results";
      proposals: LayoutProposal[];
      by: DescribeBy;
      model: string;
      description: string;
      /** «Detalles» written to the document from this answer (only the fields the user had not set). */
      filled: Partial<ProposalDetails> | null;
    }
  | { kind: "empty"; by: DescribeBy }
  | { kind: "failed"; message: string; fallback: AiFallbackReason | null }
  | { kind: "cancelled"; spent: boolean };

/** What applying a variant did (for the «Ajustado · Deshacer» toast). */
export type AppliedProposal = {
  screens: number;
  adjustments: number;
  /** The style before (restored by the toast's «Deshacer»), when the variant changed it. */
  previousStyle: string | null;
  token: number;
};

const SEARCH_DICTS = [layoutText.es.blocks, layoutText.en.blocks] as const;
const PROPOSAL: ReadonlySet<string> = new Set(PROPOSAL_BLOCK_TYPES);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A brand name nobody chose: «Mi marca» / «My brand». */
const DEFAULT_NAMES: ReadonlySet<string> = new Set(locales.map((locale) => flowText[locale].doc.defaultName));

let proposalRun = 0;

export function useDescribe(mode: "start" | "add") {
  const t = useDictionary(layoutText);
  const { locale } = useI18n();
  const ai = useLayoutAi();
  const dialog = useLayoutAiDialog();
  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const { doc } = useLayoutEnv();
  const designStore = useOptionalDesignDocStore();
  const [phase, setPhase] = useState<DescribePhase>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);
  // «Usar mi propia key» proposes again once the key is saved.
  const proposeRef = useRef<((description: string, kind: DescribeKind) => Promise<void>) | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  /**
   * «Detalles» inferred from the description (the AI, or the product type without it) fill the fields the user has
   * not set: a default brand name, an empty tagline, «Otro» as product type. Only when starting a project, as one undo
   * step of the document; the user corrects them in «Detalles».
   */
  const fillDetails = useCallback(
    (details: ProposalDetails | null): Partial<ProposalDetails> | null => {
      if (mode !== "start" || !details || !designStore) return null;
      const { doc: current, actions: docActions } = designStore.getState();
      if (!current) return null;
      const filled: Partial<ProposalDetails> = {};
      if (details.brandName && DEFAULT_NAMES.has(current.brand.name)) filled.brandName = details.brandName;
      if (details.tagline && !current.brand.tagline) filled.tagline = details.tagline;
      if (details.productType && current.brief.productType === GENERIC_PRODUCT_ID) filled.productType = details.productType;
      if (Object.keys(filled).length === 0) return null;
      docActions.beginBatch();
      if (filled.brandName || filled.tagline) {
        docActions.setBrandText({ ...(filled.brandName && { name: filled.brandName }), ...(filled.tagline && { tagline: filled.tagline }) });
      }
      if (filled.productType) docActions.setProductType(filled.productType, { applyDefaults: !docHasDesign(current) });
      docActions.commitBatch();
      return filled;
    },
    [mode, designStore],
  );

  const normalize = useCallback(
    (result: LayoutAiResult["answer"], by: DescribeBy, model: string, description: string) => {
      if (result.task !== "propose") return setPhase({ kind: "empty", by });
      const proposals = normalizeProposals(result.answer, {
        labelFor: (type) => t.blocks[type].name,
        mapType: (raw) => searchBlocks(raw, SEARCH_DICTS).find((type) => PROPOSAL.has(type)) ?? null,
        screenName: (index) => t.describe.fallback.screen(index + 1),
        idPrefix: `p${++proposalRun}-`,
      });
      if (proposals.length === 0) return setPhase({ kind: "empty", by });
      setPhase({ kind: "results", proposals, by, model, description, filled: fillDetails(normalizeDetails(result.answer.details)) });
    },
    [t, fillDetails],
  );

  /** The request for the current inputs; `null` while the description is too short. */
  const bodyFor = useCallback(
    (description: string, kind: DescribeKind): ProposeRequestBody | null => {
      const text = cleanDescription(description);
      if (text.length < MIN_DESCRIPTION_LENGTH) return null;
      const { screens, screenOrder } = store.getState();
      const existing =
        mode === "add"
          ? screenOrder
              .flatMap((id) => (screens[id] ? [{ name: screens[id].name.slice(0, 60), kind: screens[id].kind }] : []))
              .filter((screen) => screen.name.trim())
              .slice(0, LAYOUT_MAX_EXISTING)
          : [];
      const productType = doc.brief.productType;
      return {
        task: "propose",
        description: text,
        locale,
        kind,
        variants: 3,
        ...(productType.length <= 48 && SLUG.test(productType) && productType !== GENERIC_PRODUCT_ID && { productType }),
        ...(existing.length > 0 && { existing }),
      };
    },
    [store, mode, doc, locale],
  );

  const openDialog = useCallback(
    (body: ProposeRequestBody, view: "key" | "manual", reason: AiFallbackReason | null, retry?: () => void) => {
      dialog?.open({
        view,
        reason,
        manual: ai.manualJob(body),
        onManualResult: (result) => normalize(result.answer, "claude", result.model, body.description),
        ...(retry && { onKeySaved: retry }),
      });
    },
    [dialog, ai, normalize],
  );

  const propose = useCallback(
    async (description: string, kind: DescribeKind) => {
      const body = bodyFor(description, kind);
      if (!body) return;
      const retry = () => void proposeRef.current?.(description, kind);
      if (ai.source === null) {
        openDialog(body, "key", ai.fallbackReason, retry);
        return;
      }
      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      const spends = ai.source === "hosted";
      setPhase({ kind: "proposing", spends });
      try {
        const result = await ai.request(body, { signal: own.signal });
        if (controller.current !== own) return;
        normalize(result.answer, "ai", result.model, body.description);
      } catch (error) {
        if (controller.current !== own) return;
        if (error instanceof LayoutAiError && error.code === "aborted") {
          setPhase({ kind: "cancelled", spent: spends });
          return;
        }
        const fallback = error instanceof LayoutAiError ? error.fallback : null;
        setPhase({ kind: "failed", message: error instanceof Error ? error.message : String(error), fallback });
      } finally {
        if (controller.current === own) controller.current = null;
      }
    },
    [ai, bodyFor, normalize, openDialog],
  );

  useEffect(() => {
    proposeRef.current = propose;
  }, [propose]);

  const cancel = useCallback(() => controller.current?.abort(), []);

  /** «Sin IA»: keywords and the library's es/en synonyms. Costs nothing, never fails. */
  const proposeWithoutAi = useCallback(
    (description: string, kind: DescribeKind) => {
      const text = cleanDescription(description);
      if (text.length < MIN_DESCRIPTION_LENGTH) return;
      controller.current?.abort();
      controller.current = null;
      const answer = fallbackAnswer(text, {
        kind,
        variants: 3,
        search: (query) => searchBlocks(query, SEARCH_DICTS),
        text: t.describe.fallback,
      });
      normalize({ task: "propose", answer }, "fallback", "", text);
    },
    [t, normalize],
  );

  const openKey = useCallback(
    (description: string, kind: DescribeKind) => {
      const body = bodyFor(description, kind);
      if (body) openDialog(body, "key", ai.fallbackReason, () => void propose(description, kind));
    },
    [bodyFor, openDialog, ai, propose],
  );
  const openClaude = useCallback(
    (description: string, kind: DescribeKind) => {
      const body = bodyFor(description, kind);
      if (body) openDialog(body, "manual", null);
    },
    [bodyFor, openDialog],
  );

  /** ONE undo step of the layout: the screens of `proposal` (and its style when `withStyle`). `null` past the limits. */
  const apply = useCallback(
    (
      proposal: LayoutProposal,
      options: { mode: ProposalMode; withStyle: boolean; from?: Extract<DescribePhase, { kind: "results" }> | null },
    ): AppliedProposal | null => {
      const from = options.from ?? (phase.kind === "results" ? phase : null);
      if (!from) return null;
      const brief: LayoutBrief = {
        description: from.description.slice(0, 500),
        source: from.by,
        variant: proposal.name.slice(0, 80),
        ...(proposal.rationale && { rationale: proposal.rationale.slice(0, 300) }),
        ...(from.model && { model: from.model.slice(0, 80) }),
      };
      const created = actions.applyProposal(proposal.screens, { mode: options.mode, brief });
      if (created.length === 0) return null;
      const token = actions.changeToken();
      const before = store.getState().style;
      let previousStyle: string | null = null;
      if (options.withStyle && proposal.recipeId && getStyleRecipe(proposal.recipeId) && before !== proposal.recipeId) {
        previousStyle = before;
        actions.setStyle(proposal.recipeId);
      }
      // «Proponer otras» may still be running: its answer would land on screens nobody looks at.
      const running = controller.current;
      controller.current = null;
      running?.abort();
      setPhase({ kind: "idle" });
      return { screens: created.length, adjustments: proposal.warnings.length, previousStyle, token };
    },
    [phase, actions, store],
  );

  const reset = useCallback(() => setPhase({ kind: "idle" }), []);

  return { phase, propose, proposeWithoutAi, cancel, openKey, openClaude, apply, reset, bodyFor, ai };
}
