# Login y «Mis diseños»: pendientes

Rama `feat/auth` (2026-10-10). Better Auth 1.7.7 en el Postgres de Supabase, schema `dialmade_auth`. Lo que falta o queda decidido para después.

## Bloqueante para usarlo con la base real

- [x] **Migración aplicada** (2026-10-10, con aprobación del usuario): `supabase migration repair --status applied 20261010120000` y después `supabase db push` con el pooler en modo sesión (5432). RLS está activo en las 12 tablas de `dialmade` y `dialmade_auth`, y `anon`/`authenticated` no tienen permisos.
- [x] **`DATABASE_SSL_CA`** (2026-10-10). Es la «Supabase Root 2021 CA» (SHA-256 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`), sacada de la cadena del pooler y probada con verificación completa. Está en `.env.local` y en `apps/web/.env.vercel-production`. Conviene compararla una vez con la que se descarga del dashboard.
- [x] **`BETTER_AUTH_SECRET`** (2026-10-10). Hay uno en `.env.local` para desarrollo y otro distinto en `.env.vercel-production`.
- [x] **Producción preparada** (2026-10-10). La app vivirá en `https://dialmade.com` (decisión del usuario). `apps/web/.env.vercel-production` está ignorado por git y Next no lo carga solo; trae todas las variables listas para importar en Vercel (Settings → Environment Variables → Import). Faltan OAuth y Resend.
- [ ] **Comprar `dialmade.com`.** Hoy no está registrado. Sin él no se pueden verificar el dominio de Resend ni el branding de Google.
- [ ] **Apps OAuth** (con aprobación del usuario):
  - GitHub, callback `<BETTER_AUTH_URL>/api/auth/callback/github`;
  - Google, redirect `<BETTER_AUTH_URL>/api/auth/callback/google`.
  - Hasta entonces, los dos botones dicen «No configurado».
- [ ] **Email en producción:** `DIALMADE_EMAIL_FROM` más `RESEND_API_KEY` (dominio verificado en Resend) o `SMTP_URL`. Sin ellos, el magic link dice «No configurado» en producción.

## Variables nuevas (todas solo en el servidor; ver `apps/web/.env.example`)

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Postgres por el pooler (6543) | Para tener cuentas |
| `DATABASE_SSL_CA` / `DATABASE_SSL` | Verificar el TLS de Supabase | En producción |
| `DIALMADE_DB_POOL_MAX` | Conexiones por proceso | No |
| `BETTER_AUTH_SECRET` | Firma sesiones y cifra tokens OAuth | En producción |
| `BETTER_AUTH_URL` | Origen público (https) | En producción, si difiere de `NEXT_PUBLIC_APP_URL` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Orígenes extra (previews) | No |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Login con GitHub | No |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login con Google | No |
| `DIALMADE_EMAIL_FROM` + `RESEND_API_KEY` o `SMTP_URL` | Envío del magic link | En producción |
| `DIALMADE_EMAIL_DAILY_CAP` | Magic links al día para toda la app (90) | No |
| `DIALMADE_FEATURE_BILLING`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Suscripciones (apagadas) | No (`billing.md`) |

`turbo.json` ya las declara (`build.env` y `dev.passThroughEnv`).

## Free tier de IA por usuario (se conecta después)

Hoy la IA cuenta los usos gratis por **dispositivo anónimo**: la cookie firmada `dm_device` (path `/api/ai`) y el ledger `dialmade.ai_usage(month, device_id)`. Este chat no toca `src/lib/ai/**` ni `app/api/ai/**` porque otro chat trabaja ahí (`feat/ai-layout`). Para pasar a «por usuario»:

1. **Identidad del caller.** En `src/lib/ai/access.ts`, al resolver el caller, se llama a `getSessionUser(request)` de `@/lib/auth/server`. Con una cuenta (no anónima), el ledger se cuenta con `user:<userId>`, y sin cuenta, con el `device_id` de siempre. La columna `device_id` admite hasta 128 caracteres, así que basta con el prefijo y no hace falta migración.
2. **El dispositivo pasa a la cuenta.** Al entrar, los usos ya gastados de ese mes deben seguir contando. Hay dos opciones:
   - **(a)** En `onLinkAccount` (`lib/auth/auth.ts`) no se puede leer `dm_device`, porque su path es `/api/ai`. La primera petición de IA con sesión ve las dos identidades (cookie `dm_device` y sesión) y suma los usos del dispositivo al usuario en una función SQL `dialmade_ai_link_device(p_device_id, p_user_key)`: suma `free_uses_used` del mes y marca el dispositivo como enlazado, para que no se pueda «recargar» borrando cookies y entrando con otra cuenta.
   - **(b)** Más simple: contar `max(device, user)` para ese mes.
   - Recomendado: **(a)**.
3. **Límite por usuario.** `DIALMADE_AI_FREE_USES_PER_MONTH` sigue siendo el mismo número. Más adelante, el plan de pago (`billing.md`) lo sube.
4. **Abuso.** Crear cuentas nuevas con magic link para conseguir más usos gratis lo siguen limitando:
   - el límite diario por IP (`DIALMADE_AI_MAX_REQUESTS_PER_IP_PER_DAY`);
   - el presupuesto global mensual;
   - el throttle de magic links por email y por IP.
5. **Tests.** Los de `access.test.ts` añaden el caso «con sesión»: el caller es el usuario y el dispositivo enlazado no regala usos.

## Revisión de seguridad (2026-10-10)

Una revisión adversarial de la rama encontró estos puntos y ya están corregidos:

- **Login CSRF con magic link (alto).** El link de otra persona, abierto en un dispositivo anónimo, se llevaba sus diseños a esa cuenta. Ahora:
  - `verify` solo se acepta desde `/login/confirm`, que muestra «Vas a entrar como …» con el email firmado;
  - el traspaso exige que **este** dispositivo haya pedido el link con ese email (cookie firmada `dialmade.link_intent`);
  - si no, el usuario anónimo y sus diseños se quedan donde estaban.
- **Open redirect** en `safeCallbackPath` (`/.//evil.com`, `%2f`, `%5c`).
- **Llenar la base:**
  - cuota por usuario: 200 diseños / 25 MB, y 20 / 3 MB sin cuenta;
  - 120 escrituras cada 10 min por usuario;
  - el traspaso respeta los límites;
  - el body se lee con tope.
- **Cupo de emails:** tope diario global (`DIALMADE_EMAIL_DAILY_CAP`, 90) e IPv6 agrupado por /56.
- **POST cross-site** a `/api/auth/*` rechazados aunque no haya cookies.
- **Passkeys** solo para cuentas con email verificado, y no se crean cuentas no anónimas con email sin verificar.
- **Tokens OAuth** cifrados en la base (`encryptOAuthTokens`).

Abiertos, con decisión pendiente:

- [ ] **Captcha (Turnstile, gratis)** en magic link y anónimo: el plugin `captcha` de Better Auth con `TURNSTILE_SECRET_KEY` y el widget en `AuthForm`. Frena scripts que rotan IPs. Hoy los frenan el rate limit por IP (/56), el tope por email y el tope diario.
- [ ] **Bloqueo por email.** Cualquiera puede gastar los 5 links por hora de una dirección y bloquear su magic link durante esa hora. Es el precio del límite por email. GitHub, Google o una passkey siguen funcionando.
- [ ] **Self-hosting sin proxy.** En producción fuera de Vercel sin `DIALMADE_TRUSTED_PROXY_HOPS`, todos los clientes comparten un único cubo de rate limit (avisa una vez en el log). En Vercel se usa `x-real-ip`.
- [ ] **Tokens de sesión** en claro en `dialmade_auth.session` (lo normal en Better Auth). Mitigación: que `DATABASE_URL` use un rol con lo justo en lugar de `postgres`. Crear el rol `dialmade_app` con permisos solo sobre `dialmade_auth` y `dialmade` necesita la aprobación del usuario.
- [ ] **`import "server-only"`** en `lib/auth`, `lib/db` y `lib/designs`. Hoy solo llegan booleanos al cliente; el paquete daría un error de build si alguien importa un secreto desde el cliente.

## Mejoras anotadas (no bloquean)

- **Limpieza programada.** `dialmade_auth.purge_stale(30)` borra los anónimos sin actividad en 30 días (con sus diseños, por cascade), las sesiones caducadas y los contadores viejos. Programarlo con `pg_cron`, que es gratis en Supabase: `select cron.schedule('dialmade-auth-purge', '17 4 * * *', $$select dialmade_auth.purge_stale(30)$$);`. Necesita aprobación, porque toca la base.
- **El logo no se guarda.** Un diseño guardado conserva colores, tipografía, pantallas y textos, pero no la imagen del logo, que vive como blob URL en el navegador. Para guardarla haría falta Supabase Storage (bucket privado, firmado por el servidor) y `brand.logoRef`.
- **Borrar la cuenta.** Better Auth tiene `user.deleteUser`, que no está activado. Activarlo con verificación por email y un «Borrar mi cuenta» en el menú; los diseños se van por cascade.
- **Lista de sesiones y passkeys.** Una página «Cuenta» con las sesiones activas (`listSessions` / `revokeSession`) y las passkeys (`passkey.listUserPasskeys` / `deletePasskey`). Hoy solo se puede añadir una passkey.
- **Autosave.** Hoy se guarda con «Guardar» o ⌘S. Un autosave con debounce (PATCH) sería el siguiente paso, cuidando no pisar ediciones de otra pestaña (`updated_at` como versión optimista).
- **Ordenar por «Abierto recientemente».** Hoy se ordena por edición.
- **Miniaturas reales.** Hoy la tarjeta es un gradiente de la paleta, como en la referencia Magnific. Se podría renderizar un mini de la primera pantalla (`@dialmade/sections` minis), en el cliente y bajo demanda.
- **Supabase Data API.** Los schemas `dialmade_auth` y `dialmade` no están expuestos. Si alguien los añade en Settings → API, RLS sigue sin políticas y bloquea a `anon` y a `authenticated`.
- **Dev server en el puerto 3700.** `pnpm dev` usa 3000. `.claude/launch.json` tiene `web-auth` en 3700, y en desarrollo Better Auth asume `http://localhost:3700` salvo que se defina `BETTER_AUTH_URL`.
