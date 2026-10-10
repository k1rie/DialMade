// Server only. The email of a magic link travels in the link, signed with its token, so /login/confirm can
// show «Vas a entrar como …» only for links this server sent.
import { createHmac, timingSafeEqual } from "node:crypto";

export const magicLinkSignature = (secret: string, token: string, email: string) =>
  createHmac("sha256", secret).update(`dialmade-ml:v1:${token}:${email.trim().toLowerCase()}`).digest("base64url");

export function verifyMagicLinkSignature(secret: string, token: string, email: string, signature: string): boolean {
  const expected = Buffer.from(magicLinkSignature(secret, token, email));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
