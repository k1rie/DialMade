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
      busy: "Espera a que termine Generar",
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
      invalid: "No se pudo generar este layout. Tus cambios siguen en Layout.",
    },
    /** Ajustar and Exportar while the Layout draft has changes that are not generated yet. */
    pending: {
      message: "Tienes cambios en Layout sin generar. Aquí ves el último diseño generado.",
      generate: "Generar",
      generateLabel: "Generar ahora los cambios de Layout",
      generated: "Diseño generado con tus cambios de Layout.",
      blocked: "No se pudo generar desde aquí. Abre Layout para ver por qué.",
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
      busy: "Wait for Generate to finish",
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
      invalid: "Couldn't generate this layout. Your changes are still in Layout.",
    },
    /** Ajustar and Exportar while the Layout draft has changes that are not generated yet. */
    pending: {
      message: "You have Layout changes that aren't generated yet. This is the last generated design.",
      generate: "Generate",
      generateLabel: "Generate the Layout changes now",
      generated: "Design generated with your Layout changes.",
      blocked: "Couldn't generate from here. Open Layout to see why.",
    },
  },
});

export type FlowDictionary = (typeof flow)["es"];
