import { defineDictionary } from "./config";

/** Texts of the flow shell: stepper, step regions and document defaults. */
export const flow = defineDictionary({
  es: {
    stepper: {
      label: "Pasos del diseño",
      brand: "Marca",
      layout: "Layout",
      compose: "Ajustar",
      export: "Exportar",
      position: (n: number, total: number) => `Paso ${n} de ${total}`,
      locked: "Completa el paso anterior primero",
    },
    doc: {
      defaultName: "Mi marca",
    },
    fileDrop: {
      blocked: "Para cambiar el logo, vuelve al inicio.",
    },
    stage: {
      drop: "Inicio",
      crop: "Recortar el logo",
      extracting: "Extrayendo los colores del logo",
      palette: "Marca",
      layout: "Layout",
      compose: "Ajustar",
    },
    generate: {
      locked: "Un bloque que quitaste tiene valores bloqueados por tu guía. ¿Desbloquear y borrar?",
      unlockAndDelete: "Desbloquear y borrar",
    },
  },
  en: {
    stepper: {
      label: "Design steps",
      brand: "Brand",
      layout: "Layout",
      compose: "Adjust",
      export: "Export",
      position: (n: number, total: number) => `Step ${n} of ${total}`,
      locked: "Finish the previous step first",
    },
    doc: {
      defaultName: "My brand",
    },
    fileDrop: {
      blocked: "To change the logo, go back to the start.",
    },
    stage: {
      drop: "Start",
      crop: "Crop the logo",
      extracting: "Extracting the logo's colors",
      palette: "Brand",
      layout: "Layout",
      compose: "Adjust",
    },
    generate: {
      locked: "A block you removed has values locked by your guide. Unlock and delete?",
      unlockAndDelete: "Unlock and delete",
    },
  },
});

export type FlowDictionary = (typeof flow)["es"];
