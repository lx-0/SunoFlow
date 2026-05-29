import { NextResponse } from "next/server";
import { authRoute, resultResponse, successResponse } from "@/lib/route-handler";
import { Tags } from "@/lib/tags";
import {
  updateTagBodySchema,
  type UpdateTagBody,
} from "@/lib/tags/request";

export const PATCH = authRoute<{ id: string }, UpdateTagBody>(async (_request, { auth, params, body }) => {
  const result = await Tags.update(auth.userId, params.id, {
    name: body.name,
    color: body.color,
  });
  if (!result.ok) return resultResponse(result);
  return NextResponse.json({ tag: result.data });
}, { route: "/api/tags/[id]", body: updateTagBodySchema });

export const DELETE = authRoute<{ id: string }>(async (_request, { auth, params }) => {
  const result = await Tags.remove(auth.userId, params.id);
  if (!result.ok) return resultResponse(result);
  return successResponse();
}, { route: "/api/tags/[id]" });
