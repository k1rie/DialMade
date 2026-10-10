"use client";

import { useState } from "react";
import { DndProvider } from "@/components/dnd/DndProvider";
import { DesignDocProvider, type DesignDocState } from "@/hooks/useDesignDoc";
import { PaletteFlowProvider } from "@/hooks/usePaletteFlow";
import type { PromoSceneId } from "../../../../promo/scenes";
import { SCENE_STEP, loadPromoEngine, type PromoData } from "../setup";
import { FlowShell } from "./FlowShell";

export type FlowSceneProps = {
  scene: PromoSceneId;
  transparent: boolean;
  data: PromoData;
};

type DocInitial = Partial<Omit<DesignDocState, "actions">>;

/**
 * What PaletteFlow leaves in the DesignDoc store at the scene's step: the doc, the (uncropped) logo and, once
 * «Generar» wrote screens, the first one active (`applyGenerate`).
 */
function docInitial(scene: PromoSceneId, data: PromoData): DocInitial | undefined {
  const step = SCENE_STEP[scene];
  const logoUrl = step === "drop" || step === "crop" ? undefined : data.brand?.logo.objectUrl;
  if (!data.doc) return logoUrl ? { logoUrl } : undefined;
  const activeKey = data.doc.screenOrder[0];
  return { doc: data.doc, activePage: data.doc.brief.focus, ...(activeKey && { activeKey }), ...(logoUrl && { logoUrl }) };
}

/**
 * The providers PaletteFlow mounts (flow state, DesignDoc store loaded through the design half, DnD),
 * with the store starting where the flow would have left it, and the flow driven to the scene's step.
 */
export function FlowScene({ scene, transparent, data }: FlowSceneProps) {
  const [initialState] = useState(() => docInitial(scene, data));
  return (
    <PaletteFlowProvider>
      <DesignDocProvider loadEngine={loadPromoEngine} initialState={initialState}>
        <DndProvider>
          <FlowShell scene={scene} transparent={transparent} data={data} />
        </DndProvider>
      </DesignDocProvider>
    </PaletteFlowProvider>
  );
}
