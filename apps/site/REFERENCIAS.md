# Landing de marketing: referencias

Elegida por el usuario el 2026-10-10. Aquí solo hay links: las imágenes son de Mobbin y no se guardan en el repo.

## Elegida: A · «Lienzo vivo»

| Rol | Sitio | Qué tomamos | Link |
|---|---|---|---|
| Principal | FLORA | Hero centrado con nodos flotando sobre la grilla de puntos, cards numeradas «01 Ideate» con un trozo de UI dentro, menú «Add Block» con atajos, cursores con nombre y nodos con cabecera (título · detalle) | https://mobbin.com/sites/flora-1d28521c-0833-4caf-8ef3-5f59b6118841/f62fb1f4-6a94-486e-acc9-519d16515773/preview |
| Apoyo | Save.design | Fichas rotadas sobre la grilla de puntos alrededor de un titular, bordes finos, marcas «+» en las esquinas como en un plano técnico y panel de terminal | https://mobbin.com/sites/save-design-1a158574-6387-4128-9ee6-35330df47f98/ba8dc8c0-fe81-4036-9ec3-de809c83c8fd/preview |

**Adaptación al DESIGN-BRIEF:**
- Bloques con nombre (wireframe ↔ diseño con una marca ficticia) en lugar de fotos.
- Tipografía tipo Apple en lugar de serif o mono.
- CTA morado (`glow-purple`) en lugar de verde.
- Glow blanco arriba y dos orbes morados estáticos.
- Sin 3D ni vídeo.

## Mapa por sección

| Sección | De dónde sale | Componente |
|---|---|---|
| Nav | FLORA | `SiteNav` |
| Hero: copy + ventana con la demo viva | Save.design (ventana grande bajo el titular) y Railway (el lienzo real del producto bajo el hero) | `Hero`, `Hero/LayoutDemo` |
| Modo Layout (banda de texto) | FLORA «One canvas»; las referencias elegidas del lienzo 11B Replit (barra inferior) y 11F Klaviyo (librería, Desktop/Mobile) viven dentro de la demo | `LayoutSection` |
| Cómo funciona (01–05) | FLORA «01 Ideate / 02 Iterate / 03 Scale» | `HowItWorks` |
| Funciones | Save.design (fichas alrededor del titular) | `Features` |
| Open source | Save.design (marcas «+», terminal) | `OpenSource` |
| CTA final y footer | FLORA | `FinalCta`, `SiteFooter` |

## Historia del hero

La primera versión del hero tenía seis bloques pequeños flotando alrededor del titular. No funcionó: eran
wireframes y barritas grises, de un tamaño parecido, enmarcados, inclinados y sin tocar los bordes, así que
parecían pegatinas. FLORA hace lo contrario: imágenes grandes con contenido real, sin marco ni inclinación,
de tamaños muy distintos, que se superponen y se salen de la pantalla.

Se compararon tres composiciones y se eligió la tercera de la página de pruebas:

1. **Un layout, tres diseños:** nodos y conectores, como «Generative workflows» de FLORA.
2. **Collage de resultados:** el hero de FLORA con diseños de marcas ficticias de muestra.
3. **El producto es el hero:** la demo del Modo Layout en una ventana grande bajo el titular. **Elegida.**

## Opciones que no se eligieron

- **B · «Recorrido en capas»:** Railway + Linear + Supabase.
- **C · «La interfaz da la luz»:** Vercel + Framer + Resend.

Los links están en el historial del chat del 2026-10-10.
