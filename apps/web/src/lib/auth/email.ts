// Server only. Every email goes through `EmailSender`: in development the console one (the magic link is
// printed in the server log), in production Resend (HTTP API, no SDK) or SMTP (nodemailer), chosen by env.
import { authText } from "@/i18n/auth";
import { defaultLocale, isLocale } from "@/i18n/config";
import type { EmailTransportConfig } from "./config";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

export interface EmailSender {
  readonly kind: EmailTransportConfig["kind"];
  send(message: EmailMessage): Promise<void>;
}

export class EmailSendError extends Error {
  override readonly name = "EmailSendError";
}

/** Development: prints the email (and its link) in the server console. Never used in production. */
export function consoleSender(log: (line: string) => void = console.info): EmailSender {
  return {
    kind: "console",
    async send(message) {
      log(`\n[auth] ✉️  ${message.subject} → ${message.to}\n${message.text}\n`);
    },
  };
}

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export function resendSender(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): EmailSender {
  return {
    kind: "resend",
    async send(message) {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      // The body may echo the request: only the status is logged.
      if (!response.ok) throw new EmailSendError(`Resend answered ${response.status}`);
    },
  };
}

/** Any SMTP server: SMTP_URL = smtps://user:pass@host:465 (or smtp://…:587 with STARTTLS). */
export function smtpSender(url: string, from: string): EmailSender {
  let transport: Promise<{ sendMail: (options: Record<string, unknown>) => Promise<unknown> }> | null = null;
  return {
    kind: "smtp",
    async send(message) {
      transport ??= import("nodemailer").then((nodemailer) => nodemailer.createTransport(url));
      try {
        await (await transport).sendMail({ from, to: message.to, subject: message.subject, text: message.text, html: message.html });
      } catch (error) {
        throw new EmailSendError(`SMTP failed: ${(error as { code?: string }).code ?? "error"}`);
      }
    },
  };
}

export function createEmailSender(config: EmailTransportConfig): EmailSender {
  switch (config.kind) {
    case "console":
      return consoleSender();
    case "resend":
      return resendSender(config.apiKey, config.from);
    case "smtp":
      return smtpSender(config.url, config.from);
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** The magic link email in the locale the form was in. Plain, light, no images or tracking. */
export function magicLinkEmail(to: string, url: string, locale: unknown = defaultLocale): EmailMessage {
  const t = authText[isLocale(locale) ? locale : defaultLocale].email;
  const safeUrl = escapeHtml(url);
  const text = `${t.heading}\n\n${t.body}\n\n${url}\n\n${t.ignore}`;
  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f6f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#18171f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:14px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<h1 style="margin:0 0 12px;font-size:20px;line-height:26px">${escapeHtml(t.heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4a4858">${escapeHtml(t.body)}</p>
<a href="${safeUrl}" style="display:inline-block;background:#6d3fe0;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">${escapeHtml(t.button)}</a>
<p style="margin:24px 0 4px;font-size:13px;line-height:18px;color:#6b6879">${escapeHtml(t.fallback)}</p>
<p style="margin:0 0 24px;font-size:12px;line-height:18px;word-break:break-all"><a href="${safeUrl}" style="color:#6d3fe0">${safeUrl}</a></p>
<p style="margin:0;font-size:13px;line-height:18px;color:#6b6879">${escapeHtml(t.ignore)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { to, subject: t.subject, text, html };
}
