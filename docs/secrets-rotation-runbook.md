# Secrets Rotation Runbook

Checklist for rotating each secret in SunoFlow. Run this whenever a secret is suspected compromised or on a regular rotation schedule.

---

## AUTH_SECRET

Used by NextAuth to sign session JWTs.

**Impact of rotation:** All existing sessions are immediately invalidated — all users are logged out.

**Steps:**
1. Generate a new secret: `npx auth secret`
2. Update the `AUTH_SECRET` value in Railway staging environment variables.
3. Verify staging login works.
4. Update the `AUTH_SECRET` value in Railway production environment variables.
5. Deploy (or Railway will pick up the env change automatically).

---

## DATABASE_URL / SUNOFLOW_DATABASE_URL

PostgreSQL connection string including credentials.

**Impact of rotation:** App cannot connect to the database until new credentials are set.

**Steps:**
1. In Railway (or your Postgres provider), create a new database user with the same privileges as the current one, or rotate the password on the existing user.
2. Update `DATABASE_URL` and `SUNOFLOW_DATABASE_URL` in Railway staging.
3. Redeploy staging and verify database connectivity.
4. Update both vars in Railway production and redeploy.
5. Once confirmed working, revoke or delete the old credentials from the database.

---

## SUNOAPI_KEY

API key for sunoapi.org music generation.

**Impact of rotation:** Music generation breaks until the new key is set. Users with their own keys in Settings are unaffected.

**Steps:**
1. Log in to sunoapi.org and generate a new API key.
2. Update `SUNOAPI_KEY` in Railway staging, verify generation works.
3. Update `SUNOAPI_KEY` in Railway production.
4. Revoke the old key in sunoapi.org dashboard.

---

## OPENAI_API_KEY

Used for LLM features (lyrics generation, prompt suggestions, embeddings/recommendations).

**Impact of rotation:** LLM features and smart recommendations break until the new key is set.

**Steps:**
1. In the [OpenAI Dashboard](https://platform.openai.com/api-keys), create a new API key.
2. Update `OPENAI_API_KEY` in Railway staging and verify LLM features work.
3. Update `OPENAI_API_KEY` in Railway production.
4. Delete the old key from the OpenAI Dashboard.

---

## STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET

Used for subscription billing.

**Impact of rotation:** Payments and subscription management break until new keys are set. Webhook events will fail signature verification.

**Steps:**
1. In the [Stripe Dashboard](https://dashboard.stripe.com/apikeys), create a new restricted secret key with the same permissions.
2. For `STRIPE_WEBHOOK_SECRET`: navigate to Webhooks, select the endpoint, and roll the signing secret.
3. Update `STRIPE_SECRET_KEY` in Railway staging, verify checkout and billing work.
4. Update `STRIPE_WEBHOOK_SECRET` in Railway staging, send a test event and confirm it processes.
5. Repeat for production.
6. Revoke the old Stripe key.

---

## VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY

Used for Web Push notifications.

**Impact of rotation:** All existing push subscriptions are invalidated. Users must re-subscribe to receive push notifications.

**Steps:**
1. Generate new VAPID keys: `node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(k)"`
2. Update both `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Railway staging.
3. Update the public key exposed via `NEXT_PUBLIC_VAPID_PUBLIC_KEY` if applicable.
4. Redeploy and verify push notifications work (existing subscriptions will silently fail until users re-subscribe).
5. Repeat for production.

---

## CRON_SECRET

Bearer token for authenticating cron job requests from Railway cron or external schedulers.

**Impact of rotation:** Scheduled jobs (feed generation, embedding refresh, smart playlist refresh) will fail authentication until the new secret is propagated to both the service and the cron caller.

**Steps:**
1. Generate a new token: `openssl rand -hex 32`
2. Update `CRON_SECRET` in Railway staging.
3. Update the same value in the Railway cron trigger configuration (or wherever the `Authorization: Bearer ...` header is set).
4. Verify the next cron run succeeds.
5. Repeat for production.

---

## AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET

Google OAuth credentials for Sign in with Google.

**Impact of rotation:** Google sign-in breaks until new credentials are set. Existing sessions are unaffected.

**Steps:**
1. In the [Google Cloud Console](https://console.cloud.google.com/), navigate to APIs & Services > Credentials.
2. Create a new OAuth 2.0 Client ID (or rotate the client secret on the existing one).
3. Update `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Railway staging.
4. Test Google sign-in on staging.
5. Update in Railway production and verify.
6. Delete or disable the old credential.

---

## MAILJET_API_KEY / MAILJET_SECRET_KEY

Used for transactional email.

**Impact of rotation:** Emails (weekly highlights, etc.) will fail until new keys are set.

**Steps:**
1. In the Mailjet dashboard, generate a new API key pair.
2. Update `MAILJET_API_KEY` and `MAILJET_SECRET_KEY` in Railway staging.
3. Trigger a test email and confirm delivery.
4. Update in Railway production.
5. Delete the old Mailjet key pair.

---

## CI/CD Note

All secrets above are stored in GitHub Environments (`staging`, `production`) and Railway environment variables — **not** as plain repo-level secrets. When rotating, update both:

1. **Railway**: Environment Variables panel for the relevant service/environment.
2. **GitHub**: Repository Settings > Environments > `staging` or `production` > Environment secrets (for any CI steps that need the secret, e.g. `SENTRY_AUTH_TOKEN`).
