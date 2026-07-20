import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";
import { ensureFreeSubscription } from "@/lib/billing";
import { isAdminEmail } from "@/lib/auth/admin";
import { normalizeTier } from "@/lib/feature-gates";

export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          logger.warn({ emailDomain: email.split("@")[1] }, "auth: credentials sign-in failed — user not found");
          return null;
        }

        if (user.isDisabled) {
          logger.warn({ userId: user.id }, "auth: credentials sign-in rejected — account disabled");
          return null;
        }

        const passwordMatch = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) {
          logger.warn({ userId: user.id }, "auth: credentials sign-in failed — wrong password");
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        logger.info({ userId: user.id, provider: "credentials" }, "auth: sign-in success");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureFreeSubscription(user.id).catch((err) =>
          logger.error({ userId: user.id, err }, "auth: failed to create FREE subscription on signup")
        );
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id as string;
        // Update lastLoginAt for OAuth sign-ins (credentials flow does it in authorize)
        if (account?.provider !== "credentials") {
          await prisma.user.update({
            where: { id: user.id as string },
            data: { lastLoginAt: new Date() },
          });
          logger.info({ userId: user.id, provider: account?.provider ?? "oauth" }, "auth: sign-in success");
        }
        const [dbUser, sub] = await Promise.all([
          prisma.user.findUnique({
            where: { id: user.id as string },
            select: { email: true, onboardingCompleted: true, isAdmin: true, emailVerified: true, sunoApiKey: true },
          }),
          prisma.subscription.findUnique({
            where: { userId: user.id as string },
            select: { tier: true, status: true },
          }),
        ]);
        token.isAdmin = (dbUser?.isAdmin ?? false) || isAdminEmail(dbUser?.email);
        if (dbUser && token.isAdmin && !dbUser.emailVerified) {
          const now = new Date();
          await prisma.user.update({
            where: { id: user.id as string },
            data: { emailVerified: now, verificationToken: null },
          });
          dbUser.emailVerified = now;
        }
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false;
        token.emailVerified = dbUser?.emailVerified?.toISOString() ?? null;
        token.hasSunoApiKey = Boolean(dbUser?.sunoApiKey);
        token.subscriptionTier = normalizeTier(sub?.tier);
        token.subscriptionStatus = sub?.status ?? "active";
      }
      if (trigger === "update") {
        const [dbUser, sub] = await Promise.all([
          prisma.user.findUnique({
            where: { id: token.id as string },
            select: { email: true, onboardingCompleted: true, isAdmin: true, emailVerified: true, sunoApiKey: true },
          }),
          prisma.subscription.findUnique({
            where: { userId: token.id as string },
            select: { tier: true, status: true },
          }),
        ]);
        const tokenAdmin = (dbUser?.isAdmin ?? false) || isAdminEmail(dbUser?.email);
        if (dbUser && tokenAdmin && !dbUser.emailVerified) {
          const now = new Date();
          await prisma.user.update({
            where: { id: token.id as string },
            data: { emailVerified: now, verificationToken: null },
          });
          dbUser.emailVerified = now;
        }
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false;
        token.isAdmin = tokenAdmin;
        token.emailVerified = dbUser?.emailVerified?.toISOString() ?? null;
        token.hasSunoApiKey = Boolean(dbUser?.sunoApiKey);
        token.subscriptionTier = normalizeTier(sub?.tier);
        token.subscriptionStatus = sub?.status ?? "active";
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.onboardingCompleted = token.onboardingCompleted;
        session.user.isAdmin = token.isAdmin;
        session.user.emailVerified = token.emailVerified;
        session.user.hasSunoApiKey = token.hasSunoApiKey;
        session.user.subscriptionTier = token.subscriptionTier;
        session.user.subscriptionStatus = token.subscriptionStatus;
      }
      return session;
    },
  },
});
