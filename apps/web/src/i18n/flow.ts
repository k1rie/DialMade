import { defineDictionary } from "./config";

/** Texts of the flow shell: stepper, step regions and document defaults. */
export const flow = defineDictionary({
  es: {
    stepper: {
      label: "Pasos del diseño",
      brand: "Marca",
      create: "Crear",
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
      create: "Crear",
      compose: "Ajustar",
    },
  },
  en: {
    stepper: {
      label: "Design steps",
      brand: "Brand",
      create: "Create",
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
      create: "Create",
      compose: "Adjust",
    },
  },
});

export type FlowDictionary = (typeof flow)["es"];
