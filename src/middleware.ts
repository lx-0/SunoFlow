import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// In-memory IP-based rate limiter for public share pages
const PUBLIC_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const PUBLIC_RATE_LIMIT_MAX = 30; // 30 requests per minute per IP
const ipHits = new Map<string, number[]>();

function checkPublicRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - PUBLIC_RATE_LIMIT_WINDOW_MS;
  const hits = (ipHits.get(ip) ?? []).filter((t: number) => t > windowStart);
  hits.push(now);
  ipHits.set(ip, hits);

  // Periodically clean old entries to prevent memory growth
  if (ipHits.size > 10000) {
    ipHits.forEach((timestamps: number[], key: string) => {
      const recent = timestamps.filter((t: number) => t > windowStart);
      if (recent.length === 0) ipHits.delete(key);
      else ipHits.set(key, recent);
    });
  }

  return hits.length <= PUBLIC_RATE_LIMIT_MAX;
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/api/auth", "/api/register", "/api/health", "/s/"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // Rate limit public share pages
  if (pathname.startsWith("/s/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.ip ?? "unknown";
    if (!checkPublicRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect admin routes — require isAdmin on JWT token
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!token || !token.isAdmin) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
