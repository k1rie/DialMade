import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex, sha256HexSync } from "./sha256";

const bytes = (text: string) => new TextEncoder().encode(text);
const reference = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

describe("sha256", () => {
  it("matches the FIPS 180-4 vectors", () => {
    expect(sha256HexSync(bytes(""))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256HexSync(bytes("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256HexSync(bytes("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("matches node:crypto on every padding boundary and on random data", () => {
    for (const length of [55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000, 70_001]) {
      const data = new Uint8Array(length).map((_, i) => (i * 31 + length) & 0xff);
      expect(sha256HexSync(data)).toBe(reference(data));
    }
  });

  it("uses Web Crypto when available and agrees with the fallback", async () => {
    const data = bytes(":root { --primary: oklch(0.55 0.2 264); }");
    expect(await sha256Hex(data)).toBe(sha256HexSync(data));
  });
});
