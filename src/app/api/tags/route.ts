import { NextResponse } from "next/server";
import { authDataRoute, authRoute, resultResponse } from "@/lib/route-handler";
import { Tags } from "@/lib/tags";
import {
  createTagBodySchema,
  type CreateTagBody,
} from "@/lib/tags/request";

export const GET = authDataRoute(async (_request, { auth }) => {
  const tags = await Tags.list(auth.userId);
  return { tags };
}, { route: "/api/tags" });

export const POST = authRoute<Record<string, never>, CreateTagBody>(async (_request, { auth, body }) => {
  const result = await Tags.create(
    auth.userId,
    body.name ?? "",
    body.color,
  );
  if (!result.ok) return resultResponse(result);
  const { tag, created } = result.data;
  return NextResponse.json({ tag }, { status: created ? 201 : 200 });
}, { route: "/api/tags", body: createTagBodySchema });
