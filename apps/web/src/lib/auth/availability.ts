// Shared by server and client: which ways to sign in exist. Booleans only.

export type AuthAvailability = {
  /** False without DATABASE_URL (or, in production, without BETTER_AUTH_SECRET / app URL): no accounts at all. */
  enabled: boolean;
  /** An email transport exists (in development, the server console). */
  magicLink: boolean;
  github: boolean;
  google: boolean;
  passkey: boolean;
  /** «Guardar sin cuenta en este dispositivo». */
  anonymous: boolean;
  /** Development: the magic link is printed in the server console instead of being sent. */
  devEmail: boolean;
};

export const AUTH_OFF: AuthAvailability = {
  enabled: false,
  magicLink: false,
  github: false,
  google: false,
  passkey: false,
  anonymous: false,
  devEmail: false,
};
