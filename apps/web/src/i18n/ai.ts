import type { CopyApiErrorCode } from "@/lib/ai/api";
import { defineDictionary } from "./config";

type ErrorTexts = Record<CopyApiErrorCode | "no-document" | "not-implemented" | "unavailable", string>;

/** Texts of the optional AI copy (useAiCopy) and of the BYOK key dialog. */
export const ai = defineDictionary({
  es: {
    errors: {
      "ai-not-configured": "La IA no está activada en este servidor. Puedes usar tu propia API key.",
      unavailable: "La IA no está disponible ahora mismo.",
      "not-implemented": "La IA no está disponible.",
      "no-document": "Todavía no hay un diseño al que escribirle textos.",
      "invalid-request": "No pudimos enviar el diseño. Inténtalo de nuevo.",
      "payload-too-large": "El diseño es demasiado grande para enviarlo a la IA.",
      "no-page": "Esa página todavía no existe en tu diseño.",
      "no-fields": "Esas secciones no tienen textos que reescribir.",
      "budget-exceeded": "Se agotó el presupuesto de IA de este mes. Puedes seguir con tu propia API key.",
      "daily-limit": "Llegaste al límite diario de peticiones de IA. Vuelve mañana o usa tu propia API key.",
      "rate-limited": "Hay demasiadas peticiones ahora mismo. Espera unos segundos y vuelve a intentarlo.",
      overloaded: "El servicio de IA está saturado. Vuelve a intentarlo en un momento.",
      refused: "La IA no quiso escribir esos textos. Prueba con otra petición.",
      "invalid-response": "La IA devolvió una respuesta que no pudimos usar. Inténtalo de nuevo.",
      "invalid-key": "Anthropic rechazó tu API key. Revísala o pega otra.",
      "upstream-error": "La IA falló. Inténtalo de nuevo.",
      network: "No pudimos conectar con la IA. Revisa tu conexión.",
      aborted: "Cancelaste la petición.",
    } satisfies ErrorTexts,
    key: {
      title: "Usa tu propia API key",
      description:
        "Con tu key de Anthropic, los textos se generan desde tu navegador y los pagas tú. Dialmade no la guarda ni la recibe.",
      label: "API key de Anthropic",
      placeholder: "sk-ant-…",
      formatHint: "Las keys de Anthropic empiezan por «sk-ant-».",
      privacy: [
        "Solo vive en la memoria de esta pestaña: al recargar o cerrar, se olvida.",
        "Va directa de tu navegador a api.anthropic.com. Nunca pasa por nuestro servidor.",
        "Usa una key con límite de gasto y caducidad corta.",
      ],
      getKey: "Crear una key en la consola de Anthropic",
      save: "Usar esta key",
      remove: "Olvidar la key",
      active: (hint: string) => `Usando tu key ${hint} en esta pestaña.`,
      saved: "Listo: la IA usará tu key en esta pestaña.",
      removed: "Key olvidada.",
      show: "Mostrar key",
      hide: "Ocultar key",
    },
  },
  en: {
    errors: {
      "ai-not-configured": "AI is not enabled on this server. You can use your own API key.",
      unavailable: "AI is not available right now.",
      "not-implemented": "AI is not available.",
      "no-document": "There is no design to write copy for yet.",
      "invalid-request": "We couldn't send the design. Try again.",
      "payload-too-large": "The design is too large to send to the AI.",
      "no-page": "That page doesn't exist in your design yet.",
      "no-fields": "Those sections have no text to rewrite.",
      "budget-exceeded": "This month's AI budget is used up. You can keep going with your own API key.",
      "daily-limit": "You reached the daily AI request limit. Come back tomorrow or use your own API key.",
      "rate-limited": "Too many requests right now. Wait a few seconds and try again.",
      overloaded: "The AI service is overloaded. Try again in a moment.",
      refused: "The AI declined to write that copy. Try a different request.",
      "invalid-response": "The AI returned an answer we couldn't use. Try again.",
      "invalid-key": "Anthropic rejected your API key. Check it or paste another one.",
      "upstream-error": "The AI failed. Try again.",
      network: "We couldn't reach the AI. Check your connection.",
      aborted: "You cancelled the request.",
    },
    key: {
      title: "Use your own API key",
      description: "With your Anthropic key, copy is generated from your browser and billed to you. Dialmade never stores or receives it.",
      label: "Anthropic API key",
      placeholder: "sk-ant-…",
      formatHint: "Anthropic keys start with “sk-ant-”.",
      privacy: [
        "It only lives in this tab's memory: reload or close it and it's gone.",
        "It goes straight from your browser to api.anthropic.com. It never passes through our server.",
        "Use a key with a spend limit and a short expiry.",
      ],
      getKey: "Create a key in the Anthropic Console",
      save: "Use this key",
      remove: "Forget the key",
      active: (hint: string) => `Using your key ${hint} in this tab.`,
      saved: "Done: AI will use your key in this tab.",
      removed: "Key forgotten.",
      show: "Show key",
      hide: "Hide key",
    },
  },
});

export type AiDictionary = (typeof ai)["es"];
