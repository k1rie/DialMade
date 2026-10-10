# Paso «¿Qué quieres crear?»: propuesta consolidada

**Estado:** propuesta del 2026-10-09, pendiente de que el usuario confirme el orden. El detalle está en `output-type-step.md` (panel) y `output-type-critique.md` (crítica). Aquí van ya aplicadas las correcciones de la crítica.

## Las 3 opciones que ve el usuario final

| Carta | Qué obtiene | «Para ti si…» |
|---|---|---|
| **Guía de estilo** | Brand board: 01 Identidad, 02 Paleta, 03 Tipografía, 04 Formas, 05 Componentes, 06 Dirección de arte | …vas a pasarle tu marca a un diseñador o a tu IA (Claude, Cursor, v0) |
| **Landing page** | La landing de su producto (nav, hero, features, precios, CTA, footer), editable por secciones | …vas a lanzar o validar algo y necesitas una web |
| **Dashboard y componentes (web)** | UI kit con estados, más una pantalla de ejemplo (sidebar, KPIs, gráfica, tabla) | …ya construyes una app web: SaaS, panel o herramienta interna |

**Cómo se elige:**
- Hay un **foco único** y luego se pueden sumar las otras con «+ Añadir». No hay lock-in: comparten tokens y recetas en el mismo DesignDoc.
- **Si el usuario no sabe**, se le hace una sola pregunta determinista, sin IA: «¿Qué vas a hacer primero con este diseño?»
  - «Lanzar o validar una web» → Landing
  - «Construir la interfaz de mi producto» → Dashboard
  - «Pasárselo a mi diseñador o a mi IA» → Guía
- **Los tipos que aún no están listos** se muestran con su preview real y el badge «Pronto», con contador de votos. Se votan en GitHub.

## Dónde va en el flujo

**Stepper:** 1 Marca (logo, recorte, paleta) · 2 Crear (tipo y Composer) · 3 Ajustar · 4 Exportar

- Las pestañas del LivePreview del Palette Lab ya son las 3 opciones, cada una con su mini-preview pintada con la marca del usuario. El CTA dice «Crear {pestaña} →».
- La pantalla dedicada, con cartas arrastrables a un slot, solo aparece cuando hay ≥2 tipos habilitados. Para su estética se reutiliza la referencia **7A Higgsfield** (cartas de estilo), salvo que el usuario elija otra.

## Modelo de datos (resumen)

```ts
type OutputKind = "brand" | "landing" | "app";
DesignDoc { brand: { name, tagline?, logoRef, seeds, achromatic },
            brief: { productType | "generic", focus: OutputKind, ... },
            tokens, system, references, provenance,
            pages: Partial<Record<OutputKind, Page>> }   // pages[k].kind === k (Zod superRefine)
```

- La pestaña Style Guide del link **es** `pages.brand`. Nunca hay dos guías.
- `system` (recetas por componente) se compila a tokens de componente (`--button-radius`, `--card-shadow`…) para todos los exports. Así la preview y lo exportado coinciden.
- Las minis (MiniLanding, MiniApp, MiniBrand) viven en `packages/specimens/src/<Mini…>/`, con un folder por componente, porque las usan la app y el runtime del iframe.

## Orden de construcción (pendiente de decisión)

**Recomendado:** Landing y Guía en el MVP, Dashboard en «Pronto».
- La Guía ya hacía falta como Style Guide del link (vista 5, Cofounder), así que habilitarla como opción es incremental.
- La Landing es lo más visual para LinkedIn, el mejor encaje para Framer y para la edición tipo Claude Design, y ya estaba en el MVP del INFORME.
- El Dashboard es lo que más trabajo pide. Llega en la v1.2, o antes si gana en votos.

**Estimación propia, sin validar:** el MVP queda en ~12–15 semanas para 1 dev.
