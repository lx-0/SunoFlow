import Mailjet from "node-mailjet";
import { logger } from "@/lib/logger";

const APP_NAME = "SunoFlow";

function getBaseUrl(): string {
  return process.env.AUTH_URL || "http://localhost:3000";
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM || "noreply@sunoflow.com";
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;

  if (!apiKey || !secretKey) {
    // Dev fallback: log to structured logger when Mailjet keys are not configured
    logger.info({ to: payload.to, subject: payload.subject }, "email: dev-mode (no Mailjet keys) — skipping send");
    return;
  }

  const client = Mailjet.apiConnect(apiKey, secretKey);

  try {
    await client.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: getFromEmail(),
            Name: APP_NAME,
          },
          To: [
            {
              Email: payload.to,
            },
          ],
          Subject: payload.subject,
          HTMLPart: payload.html,
        },
      ],
    });
  } catch (error) {
    logger.error({ err: error }, "email: mailjet send failed");
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const url = `${getBaseUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} email`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 16px;">Welcome to ${APP_NAME}!</h2>
        <p style="color: #444; line-height: 1.6;">Click the button below to verify your email address:</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Verify Email</a>
        </p>
        <p style="color: #888; font-size: 14px;">Or copy this link: <a href="${url}" style="color: #6366f1;">${url}</a></p>
        <p style="color: #888; font-size: 14px;">If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const url = `${getBaseUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 16px;">Password Reset</h2>
        <p style="color: #444; line-height: 1.6;">Click the button below to reset your password. This link expires in 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #888; font-size: 14px;">Or copy this link: <a href="${url}" style="color: #6366f1;">${url}</a></p>
        <p style="color: #888; font-size: 14px;">If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `,
  });
}
