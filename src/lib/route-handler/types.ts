export type { PipelineCtx } from "@/lib/route-pipeline/types";

export type RouteContextKey = "auth" | "admin" | "anon";

export type AuthContext = {
  userId: string;
  isApiKey: boolean;
  isAdmin: boolean;
};

export type OptionalAuthContext = {
  userId: string | null;
  isApiKey: boolean;
  isAdmin: boolean;
};

export type AdminContext = {
  adminId: string;
};

export type AnonContext = {
  ip: string;
};

export type RateLimitConfig = {
  action: string;
  limit: number;
  windowMs: number;
};

export type PreflightResult<TContext> =
  | { ok: true; context: TContext }
  | { ok: false; error: Response };
