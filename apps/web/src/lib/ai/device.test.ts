import { describe, expect, it } from "vitest";
import {
  DEVICE_COOKIE,
  deviceSecretFor,
  hashIp,
  issueDeviceCookie,
  readCookie,
  resolveDevice,
  serializeDeviceCookie,
  verifyDeviceCookie,
} from "./device";

const SECRET = "a".repeat(64);
const OTHER = "b".repeat(64);

describe("device cookie", () => {
  it("signs a random id and verifies it only with the same secret", () => {
    const { deviceId, value } = issueDeviceCookie(SECRET);
    expect(deviceId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(verifyDeviceCookie(value, SECRET)).toBe(deviceId);
    expect(verifyDeviceCookie(value, OTHER)).toBeNull();
    expect(issueDeviceCookie(SECRET).deviceId).not.toBe(deviceId);
  });

  it("rejects tampered, truncated or foreign values", () => {
    const { value } = issueDeviceCookie(SECRET);
    const [version, id, signature] = value.split(".") as [string, string, string];
    const forgedId = `${id.slice(0, -1)}${id.endsWith("A") ? "B" : "A"}`;
    expect(verifyDeviceCookie(`${version}.${forgedId}.${signature}`, SECRET)).toBeNull();
    expect(verifyDeviceCookie(value.slice(0, -2), SECRET)).toBeNull();
    expect(verifyDeviceCookie("v2." + value.slice(3), SECRET)).toBeNull();
    expect(verifyDeviceCookie("", SECRET)).toBeNull();
    expect(verifyDeviceCookie(undefined, SECRET)).toBeNull();
  });

  it("is httpOnly, SameSite=Lax, scoped to /api/ai, and Secure only in production", () => {
    const dev = serializeDeviceCookie("v1.x.y", { secure: false });
    expect(dev).toBe(`${DEVICE_COOKIE}=v1.x.y; Path=/api/ai; Max-Age=34560000; HttpOnly; SameSite=Lax`);
    expect(serializeDeviceCookie("v1.x.y", { secure: true })).toMatch(/; Secure$/);
  });

  it("keeps a valid cookie and rotates a missing or invalid one", () => {
    const { deviceId, value } = issueDeviceCookie(SECRET);
    expect(resolveDevice(`theme=dark; ${DEVICE_COOKIE}=${value}`, SECRET, { secure: true })).toEqual({ deviceId, setCookie: null });

    const fresh = resolveDevice(null, SECRET, { secure: true });
    expect(fresh.setCookie).toContain(`${DEVICE_COOKIE}=v1.${fresh.deviceId}.`);
    const rotated = resolveDevice(`${DEVICE_COOKIE}=${value}`, OTHER, { secure: false });
    expect(rotated.deviceId).not.toBe(deviceId);
    expect(verifyDeviceCookie(readCookie(rotated.setCookie!.split(";")[0], DEVICE_COOKIE), OTHER)).toBe(rotated.deviceId);
  });

  it("reads one cookie out of a header", () => {
    expect(readCookie("a=1; dm_device=v1.x.y; b=2", "dm_device")).toBe("v1.x.y");
    expect(readCookie("xdm_device=1", "dm_device")).toBeUndefined();
    expect(readCookie(null, "dm_device")).toBeUndefined();
  });
});

describe("hashIp", () => {
  it("never contains the IP, and changes with the day and the secret", () => {
    const day = new Date("2026-10-09T08:00:00Z");
    const hash = hashIp("203.0.113.7", SECRET, day);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
    expect(hashIp("203.0.113.7", SECRET, new Date("2026-10-09T23:59:59Z"))).toBe(hash);
    expect(hashIp("203.0.113.7", SECRET, new Date("2026-10-10T00:00:00Z"))).not.toBe(hash);
    expect(hashIp("203.0.113.7", OTHER, day)).not.toBe(hash);
    expect(hashIp("203.0.113.8", SECRET, day)).not.toBe(hash);
  });
});

describe("deviceSecretFor", () => {
  it("uses the configured secret, a per-process one in development, and none in production", () => {
    expect(deviceSecretFor({ deviceSecret: SECRET, production: true })).toBe(SECRET);
    expect(deviceSecretFor({ deviceSecret: undefined, production: true })).toBeNull();
    const dev = deviceSecretFor({ deviceSecret: undefined, production: false });
    expect(dev).toMatch(/^[0-9a-f]{64}$/);
    expect(deviceSecretFor({ deviceSecret: undefined, production: false })).toBe(dev);
  });
});
