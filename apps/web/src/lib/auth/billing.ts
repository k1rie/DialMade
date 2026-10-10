// Server only. Subscriptions with Better Auth's Stripe plugin: installed and OFF. It is only built when
// DIALMADE_FEATURE_BILLING=true and both Stripe keys exist (`readAuthConfig`). There is no payment UI and no
// plan yet: see docs/design/billing.md before turning it on (it also needs its own migration).
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import type { BillingConfig } from "./config";

export function billingPlugin(config: BillingConfig) {
  return stripe({
    stripeClient: new Stripe(config.stripeSecretKey),
    stripeWebhookSecret: config.stripeWebhookSecret,
    // A Stripe customer only when someone subscribes, never for every sign-up (or anonymous device).
    createCustomerOnSignUp: false,
    subscription: { enabled: true, plans: [] },
  });
}
