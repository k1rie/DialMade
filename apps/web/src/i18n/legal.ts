import { defineDictionary } from "./config";

// Privacy policy and terms (/privacy, /terms). DRAFT written from what the code does on 2026-10-10:
// the owner must review it before launch. Keep it in step with the code (cookies, providers, retention).

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = { title: string; summary: string; sections: LegalSection[] };

const CONTACT = "hola@dialmade.com";

export const legalText = defineDictionary({
  es: {
    updated: "Última actualización: 10 de octubre de 2026",
    contact: CONTACT,
    links: { privacy: "Privacidad", terms: "Términos", home: "Volver a Dialmade" },
    privacy: {
      title: "Política de privacidad",
      summary:
        "Dialmade es un proyecto open source (MIT). Funciona sin cuenta, no vende datos ni muestra publicidad, y guarda lo mínimo para que puedas entrar y conservar tus diseños.",
      sections: [
        {
          heading: "Sin cuenta",
          paragraphs: [
            "Tu logo y tu paleta se procesan en tu navegador. El logo no se sube a nuestros servidores ni se guarda en tus diseños.",
            "Para el uso gratuito de la IA ponemos una cookie de dispositivo anónima y firmada (dm_device, hasta 400 días). Para limitar el abuso contamos peticiones por IP, guardando solo un hash de la IP con una sal que cambia cada día. Esos datos se borran a los 7 y 30 días.",
          ],
        },
        {
          heading: "Con cuenta",
          paragraphs: [
            "Si entras con un enlace por email, GitHub o Google, guardamos tu email, tu nombre y tu foto de perfil (si el proveedor los da), las sesiones activas (con su IP y navegador, hasta 30 días) y, si las añades, tus passkeys (solo la clave pública).",
            "Guardamos los diseños que guardas en «Mis diseños»: colores, tipografía, pantallas y textos. Puedes borrarlos cuando quieras. Si borras tu cuenta, se borran con ella.",
            "«Guardar sin cuenta» crea un usuario anónimo ligado a este navegador. Si después entras con una cuenta desde el mismo dispositivo, sus diseños pasan a ella. Los usuarios anónimos sin actividad se borran pasado un tiempo.",
          ],
        },
        {
          heading: "IA opcional",
          paragraphs: [
            "Si usas la IA incluida, lo que le pides (por ejemplo, el brief o las capturas que decidas analizar) se envía a Anthropic para generar la respuesta. Si usas tu propia API key, la petición va directamente de tu navegador a Anthropic sin pasar por nuestros servidores, y la key no se guarda.",
          ],
        },
        {
          heading: "Proveedores",
          paragraphs: [
            "Usamos Vercel (alojamiento), Supabase (base de datos), Resend (emails de acceso), Anthropic (IA), GitHub y Google (inicio de sesión, si los eliges) y Cloudflare (DNS). Cada uno trata los datos según su propia política.",
          ],
        },
        {
          heading: "Cookies y almacenamiento local",
          paragraphs: [
            "Solo usamos cookies necesarias: la sesión (dialmade.session_token), las de seguridad del inicio de sesión y la del dispositivo para la IA. En tu navegador (localStorage) guardamos el idioma, algunas preferencias y, durante una hora como mucho, el diseño que estás guardando mientras inicias sesión. No usamos cookies de publicidad ni de analítica de terceros.",
          ],
        },
        {
          heading: "Tus derechos",
          paragraphs: [
            `Puedes pedirnos acceder a tus datos, corregirlos o borrarlos escribiendo a ${CONTACT}. Responderemos en un plazo razonable.`,
          ],
        },
      ],
    } satisfies LegalDocument,
    terms: {
      title: "Términos de uso",
      summary: "Dialmade es gratuito y open source. Al usarlo aceptas estos términos.",
      sections: [
        {
          heading: "El servicio",
          paragraphs: [
            "Dialmade te ayuda a componer una dirección de diseño: paleta, estilo, pantallas y exportaciones. Se ofrece «tal cual», sin garantías, y puede cambiar o interrumpirse. El código está publicado bajo licencia MIT.",
          ],
        },
        {
          heading: "Tu contenido",
          paragraphs: [
            "Lo que creas es tuyo. Solo subes logos, capturas o marcas sobre los que tengas derechos o permiso. No uses Dialmade para suplantar a otras marcas ni para contenido ilegal.",
          ],
        },
        {
          heading: "Uso justo",
          paragraphs: [
            "La IA gratuita y el almacenamiento tienen límites por persona, por dispositivo y por día. No intentes saltártelos, automatizar el registro de cuentas ni sobrecargar el servicio. Podemos cerrar cuentas que abusen.",
          ],
        },
        {
          heading: "Responsabilidad",
          paragraphs: [
            "Revisa lo que exportes antes de usarlo en producción, incluida la accesibilidad y los derechos de las tipografías. En la medida que permita la ley, no respondemos de daños derivados del uso del servicio.",
          ],
        },
        {
          heading: "Contacto",
          paragraphs: [`Escríbenos a ${CONTACT}.`],
        },
      ],
    } satisfies LegalDocument,
  },
  en: {
    updated: "Last updated: October 10, 2026",
    contact: CONTACT,
    links: { privacy: "Privacy", terms: "Terms", home: "Back to Dialmade" },
    privacy: {
      title: "Privacy policy",
      summary:
        "Dialmade is an open-source (MIT) project. It works without an account, never sells data or shows ads, and keeps the minimum needed to sign you in and keep your designs.",
      sections: [
        {
          heading: "Without an account",
          paragraphs: [
            "Your logo and palette are processed in your browser. The logo is not uploaded to our servers nor stored in your designs.",
            "For the free AI uses we set an anonymous, signed device cookie (dm_device, up to 400 days). To limit abuse we count requests per IP, storing only a hash of the IP salted with a value that changes every day. That data is deleted after 7 and 30 days.",
          ],
        },
        {
          heading: "With an account",
          paragraphs: [
            "If you sign in with an email link, GitHub or Google, we store your email, name and profile picture (if the provider shares them), your active sessions (with their IP and browser, up to 30 days) and, if you add them, your passkeys (public key only).",
            "We store the designs you save in “My designs”: colors, typography, screens and copy. You can delete them anytime. Deleting your account deletes them too.",
            "“Save without an account” creates an anonymous user tied to this browser. If you later sign in from the same device, its designs move to your account. Inactive anonymous users are deleted after a while.",
          ],
        },
        {
          heading: "Optional AI",
          paragraphs: [
            "If you use the included AI, what you ask for (for example the brief or the screenshots you choose to analyze) is sent to Anthropic to generate the answer. If you use your own API key, the request goes straight from your browser to Anthropic without passing through our servers, and the key is not stored.",
          ],
        },
        {
          heading: "Providers",
          paragraphs: [
            "We use Vercel (hosting), Supabase (database), Resend (sign-in emails), Anthropic (AI), GitHub and Google (sign-in, if you choose them) and Cloudflare (DNS). Each handles data under its own policy.",
          ],
        },
        {
          heading: "Cookies and local storage",
          paragraphs: [
            "We only use necessary cookies: the session (dialmade.session_token), the sign-in security ones and the device one for the AI. In your browser (localStorage) we keep the language, a few preferences and, for one hour at most, the design you are saving while you sign in. No advertising or third-party analytics cookies.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [`You can ask to access, correct or delete your data by writing to ${CONTACT}. We will answer within a reasonable time.`],
        },
      ],
    },
    terms: {
      title: "Terms of use",
      summary: "Dialmade is free and open source. By using it you accept these terms.",
      sections: [
        {
          heading: "The service",
          paragraphs: [
            "Dialmade helps you compose a design direction: palette, style, screens and exports. It is provided “as is”, without warranties, and may change or stop. The code is published under the MIT license.",
          ],
        },
        {
          heading: "Your content",
          paragraphs: [
            "What you create is yours. Only upload logos, screenshots or brands you have rights to or permission for. Do not use Dialmade to impersonate other brands or for illegal content.",
          ],
        },
        {
          heading: "Fair use",
          paragraphs: [
            "The free AI and storage have limits per person, per device and per day. Do not try to get around them, automate account sign-ups or overload the service. We may close accounts that abuse it.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "Review what you export before using it in production, including accessibility and font licenses. To the extent the law allows, we are not liable for damages arising from the use of the service.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [`Write to us at ${CONTACT}.`],
        },
      ],
    },
  },
});
