const APP_NAME = "SunoFlow";

function getBaseUrl(): string {
  return process.env.AUTH_URL || "http://localhost:3000";
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  // In dev, log to console. In prod, integrate SMTP/Resend here.
  console.log("────────────────────────────────────────");
  console.log(`📧 Email to: ${payload.to}`);
  console.log(`   Subject:  ${payload.subject}`);
  console.log(`   Body:\n${payload.html}`);
  console.log("────────────────────────────────────────");
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
      <h2>Welcome to ${APP_NAME}!</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't create an account, you can ignore this email.</p>
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
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't request a password reset, you can ignore this email.</p>
    `,
  });
}
