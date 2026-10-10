"use client";

// Browser side of Better Auth: same origin (/api/auth), cookies only (no tokens in JS).
import { passkeyClient } from "@better-auth/passkey/client";
import { anonymousClient, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), anonymousClient(), passkeyClient()],
});

export type ClientSession = typeof authClient.$Infer.Session;
