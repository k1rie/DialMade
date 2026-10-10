# Suscripciones (Stripe): instalado y apagado

**Estado (2026-10-10):** el plugin de Stripe de Better Auth (`@better-auth/stripe` 1.7.7, con `stripe` 22.x) está instalado pero **apagado**. No hay UI de pagos, planes ni cuenta de Stripe, y no se cobra nada. La app es gratis y debe seguir funcionando completa sin pagos (CLAUDE.md).

## Dónde está

- `apps/web/src/lib/auth/billing.ts` construye el plugin.
- `apps/web/src/lib/auth/config.ts` (`billing`) lo activa solo si se cumplen las tres condiciones:
  - `DIALMADE_FEATURE_BILLING=true`;
  - `STRIPE_SECRET_KEY`;
  - `STRIPE_WEBHOOK_SECRET`.
- `apps/web/src/lib/auth/auth.ts` lo añade a `plugins` solo con esa config. Un test comprueba que, por defecto, no se carga (`auth.test.ts`, «billing»).
- `createCustomerOnSignUp: false`: no se crea un cliente de Stripe por cada cuenta ni por cada dispositivo anónimo. Solo se crearía al suscribirse.

## Cómo se encendería (no hacer sin aprobación del usuario)

1. **Decidir el producto.** Qué incluye el plan de pago. Lo natural: más usos de IA al mes que el free tier y más diseños guardados que `MAX_DESIGNS_PER_USER`. Precio, moneda (USD, como el resto de la app) y si hay prueba gratis.
2. **Stripe.** Primero en modo test:
   - crear la cuenta;
   - crear el producto y su precio;
   - copiar la `sk_test_…` y el `price_…`.
3. **Plan en el código.** Rellenar `subscription.plans` en `billing.ts`, por ejemplo `[{ name: "pro", priceId: "price_…", limits: { aiUsesPerMonth: 100, designs: 1000 } }]`. Revisar también `authorizeReference`: quién puede gestionar una suscripción. Hoy solo hay usuarios, sin organizaciones.
4. **Migración.** El plugin añade `user.stripeCustomerId` y la tabla `subscription`. Va en una migración **nueva y aditiva** en el schema `dialmade_auth`. No se modifica la de auth. Lo que genera Better Auth 1.7.7 es:

   ```sql
   alter table dialmade_auth."user" add column if not exists "stripeCustomerId" text;
   create table if not exists dialmade_auth."subscription" (
     "id" text not null primary key, "plan" text not null, "referenceId" text not null,
     "stripeCustomerId" text, "stripeSubscriptionId" text, "status" text not null,
     "periodStart" timestamptz, "periodEnd" timestamptz, "trialStart" timestamptz, "trialEnd" timestamptz,
     "cancelAtPeriodEnd" boolean, "cancelAt" timestamptz, "canceledAt" timestamptz, "endedAt" timestamptz,
     "seats" integer, "billingInterval" text, "stripeScheduleId" text
   );
   alter table dialmade_auth."subscription" enable row level security;
   revoke all on dialmade_auth."subscription" from public, anon, authenticated;
   ```

   Antes de escribirla, regenerar el SQL con la versión instalada.
5. **Webhook.** En Stripe → Developers → Webhooks, apuntar a `<BETTER_AUTH_URL>/api/auth/stripe/webhook`. Eventos: `checkout.session.completed`, `customer.subscription.updated` y `customer.subscription.deleted`. Copiar el `whsec_…` a `STRIPE_WEBHOOK_SECRET`. En local: `stripe listen --forward-to localhost:3700/api/auth/stripe/webhook`.
6. **Variables.** `DIALMADE_FEATURE_BILLING=true`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`, solo en el servidor (nunca `NEXT_PUBLIC_`).
7. **UI.** Añadir `stripeClient` de `@better-auth/stripe/client` a `src/lib/auth/client.ts`. Después:
   - un «Plan» en el menú de cuenta con `subscription.upgrade` (Checkout) y `subscription.billingPortal`;
   - los textos, en `src/i18n/auth.ts` en es/en.
8. **Conectar los límites.** El free tier por usuario (`login-pendientes.md`) lee el plan activo para dar más usos. Los límites de diseños (`maxDesignsFor` en `lib/designs/handlers.ts`) igual.
9. **Seguridad.**
   - Revisar los GitHub Security Advisories de `@better-auth/stripe` (GHSA-h3rm-78g3-j7cp ya está corregido en 1.6.21+).
   - El webhook verifica la firma con `STRIPE_WEBHOOK_SECRET`. Sin ella, el plugin no se carga.
   - El rate limit de `/api/auth/*` también cubre el webhook. Si Stripe reintenta en ráfaga, añadir una regla propia en `RATE_LIMIT_RULES`.

## Apagarlo de nuevo

`DIALMADE_FEATURE_BILLING=false` (o quitar una de las claves). Las tablas se pueden quedar: nada las lee si el plugin no está.
