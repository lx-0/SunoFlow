/**
 * Sentry client-side (browser) configuration.
 * Only active when NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * Targets a GlitchTip backend (errors.yester.cloud), which is Sentry-protocol
 * compatible for error + performance envelopes but does NOT support Session
 * Replay. Replay integration is intentionally omitted.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: 0.1,
  });
}
