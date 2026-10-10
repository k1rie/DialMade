// Server only. Anonymous device id for the AI free tier («persona» until there is a login): a random id
// in an httpOnly cookie, signed with HMAC-SHA256 (DIALMADE_DEVICE_ID_SECRET). A cookie whose signature
// does not verify is replaced by a new id. Clearing cookies gives a new device: the per-IP daily limit
// and the global monthly budget bound that.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const DEVICE_COOKIE = "dm_device";
/** Only the AI routes receive it. */
export const DEVICE_COOKIE_PATH = "/api/ai";
/** Browsers cap cookie lifetime at 400 days. */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
/** Shorter secrets are ignored (fail closed in production). `openssl rand -hex 32` gives 64 chars. */
export const MIN_DEVICE_SECRET_LENGTH = 32;

const VERSION = "v1";
const ID_BYTES = 16;
const COOKIE_VALUE = /^v1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;

const signId = (id: string, secret: string) => createHmac("sha256", secret).update(`dialmade-device:${VERSION}:${id}`).digest("base64url");

/** The device id inside a cookie value, or `null` when it is malformed or its signature does not verify. */
export function verifyDeviceCookie(value: string | null | undefined, secret: string): string | null {
  const match = value ? COOKIE_VALUE.exec(value) : null;
  if (!match) return null;
  const [, id, signature] = match as unknown as [string, string, string];
  const expected = Buffer.from(signId(id, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

export function issueDeviceCookie(secret: string, random: (size: number) => Buffer = randomBytes): { deviceId: string; value: string } {
  const deviceId = random(ID_BYTES).toString("base64url");
  return { deviceId, value: `${VERSION}.${deviceId}.${signId(deviceId, secret)}` };
}

export function serializeDeviceCookie(value: string, options: { secure: boolean }): string {
  return [
    `${DEVICE_COOKIE}=${value}`,
    `Path=${DEVICE_COOKIE_PATH}`,
    `Max-Age=${DEVICE_COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(options.secure ? ["Secure"] : []),
  ].join("; ");
}

/** One cookie from a `Cookie` header (the first one with that name). */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1 || part.slice(0, index).trim() !== name) continue;
    return part.slice(index + 1).trim();
  }
  return undefined;
}

export type DeviceIdentity = {
  deviceId: string;
  /** `Set-Cookie` value when the cookie was missing or invalid (new id), else `null`. */
  setCookie: string | null;
};

export function resolveDevice(cookieHeader: string | null | undefined, secret: string, options: { secure: boolean }): DeviceIdentity {
  const known = verifyDeviceCookie(readCookie(cookieHeader, DEVICE_COOKIE), secret);
  if (known) return { deviceId: known, setCookie: null };
  const issued = issueDeviceCookie(secret);
  return { deviceId: issued.deviceId, setCookie: serializeDeviceCookie(issued.value, options) };
}

/**
 * The IP as an HMAC salted with the secret and the UTC day: the ledger can count requests per IP per
 * day without storing the IP, and hashes of different days cannot be linked.
 */
export function hashIp(ip: string, secret: string, now: Date): string {
  return createHmac("sha256", secret).update(`dialmade-ip:${VERSION}:${now.toISOString().slice(0, 10)}:${ip}`).digest("hex");
}

const DEV_SECRET_KEY = Symbol.for("dialmade.ai.devDeviceSecret");
type SecretHost = typeof globalThis & { [DEV_SECRET_KEY]?: string };

/**
 * The secret that signs device cookies: DIALMADE_DEVICE_ID_SECRET; without it, outside production, a
 * random one per process (cookies from before a restart then rotate). In production without it: `null`.
 */
export function deviceSecretFor(config: { deviceSecret: string | undefined; production: boolean }): string | null {
  if (config.deviceSecret) return config.deviceSecret;
  if (config.production) return null;
  const host = globalThis as SecretHost;
  return (host[DEV_SECRET_KEY] ??= randomBytes(32).toString("hex"));
}
