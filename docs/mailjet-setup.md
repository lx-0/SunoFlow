# Mailjet Email Setup

SunoFlow uses [Mailjet](https://www.mailjet.com/) for transactional email (verification emails, password resets). Without Mailjet configured, emails are logged to the server console instead.

## 1. Create a Mailjet Account

1. Sign up at [mailjet.com](https://www.mailjet.com/)
2. Navigate to **Account Settings > API Keys**
3. Copy your **API Key** and **Secret Key**

## 2. Configure Environment Variables

Add the following to your `.env` (or production environment):

```
MAILJET_API_KEY="your-api-key"
MAILJET_SECRET_KEY="your-secret-key"
EMAIL_FROM="noreply@yourdomain.com"
```

`EMAIL_FROM` must be an address on a domain you have verified with Mailjet (see below).

## 3. Verify Your Sending Domain

Mailjet requires domain verification to send emails that won't be flagged as spam.

1. Go to **Mailjet Dashboard > Account Settings > Sender domains & addresses**
2. Add your sending domain (e.g. `yourdomain.com`)
3. Mailjet will provide DNS records you need to add

## 4. Required DNS Records

Add these records to your domain's DNS provider:

### SPF Record

Allows Mailjet to send email on behalf of your domain.

| Type | Host | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 include:spf.mailjet.com ~all` |

If you already have an SPF record, add `include:spf.mailjet.com` before the `~all` or `-all` qualifier.

### DKIM Record

Mailjet provides a unique DKIM key for your domain. Find it in the Mailjet dashboard under **Account Settings > Sender domains & addresses > Manage > Authentication**.

| Type | Host | Value |
|------|------|-------|
| TXT | `mailjet._domainkey` | *(copy from Mailjet dashboard)* |

### DMARC Record

Tells receiving mail servers how to handle emails that fail SPF/DKIM checks.

| Type | Host | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com` |

Adjust the `p=` policy (`none`, `quarantine`, or `reject`) and `rua=` reporting address to match your needs.

## 5. Verify DNS in Mailjet

After adding DNS records:

1. Return to **Mailjet Dashboard > Account Settings > Sender domains & addresses**
2. Click **Check Now** / **Validate** next to each record type
3. DNS propagation can take up to 48 hours, but usually completes within minutes

All three checks (SPF, DKIM, DMARC) should show green/verified before sending production email.

## 6. Test Locally

With Mailjet keys configured in `.env`, trigger an email flow (e.g. register a new account). Check the Mailjet dashboard under **Email Analytics > Real-time** to confirm delivery.

Without keys configured, emails are printed to the server console for local development.
