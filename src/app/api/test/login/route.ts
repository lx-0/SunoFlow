/**
 * Test-only login endpoint for Playwright E2E tests.
 *
 * This endpoint bypasses the CSRF check by creating a signed JWT session
 * token directly and setting the session cookie, replicating what NextAuth
 * would do after a successful credentials callback.
 *
 * IMPORTANT: Only active when PLAYWRIGHT_TEST=true (set by playwright.config.ts
 * webServer env). Returns 404 in all other environments.
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { publicRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";

const testLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = publicRoute<
  Record<string, never>,
  z.infer<typeof testLoginSchema>
>(async (_req: NextRequest, { body }) => {
  // Read at request time (not module-load time) to survive Turbopack static analysis
  if (process.env.PLAYWRIGHT_TEST !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { email, password } = body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Mark onboarding as completed so the tour modal doesn't appear in E2E tests
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true },
  });

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const useSecureCookies = (process.env.AUTH_URL ?? "").startsWith("https://");
  const cookieName = useSecureCookies
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.image,
      // Include onboardingCompleted so the JWT callback propagates it to the
      // session without needing a DB read (the callback only reads DB on
      // sign-in or trigger==="update", not on normal session access)
      onboardingCompleted: true,
    },
    secret,
    salt: cookieName,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}, {
  body: testLoginSchema,
});
