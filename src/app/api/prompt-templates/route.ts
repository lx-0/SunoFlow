import { NextResponse } from "next/server";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { listTemplates, createTemplate } from "@/lib/prompt-templates";
import { listTemplatesQuery, createTemplateBody } from "@/lib/prompt-templates/request";

export const GET = authRoute(async (_request, { auth, query }) => {
  return resultResponse(await listTemplates(auth.userId, query));
}, { route: "/api/prompt-templates", query: listTemplatesQuery });

export const POST = authRoute(async (_request, { auth, body }) => {
  const result = await createTemplate(auth.userId, body);
  if (!result.ok) return resultResponse(result);
  return NextResponse.json({ template: result.data }, { status: 201 });
}, { route: "/api/prompt-templates", body: createTemplateBody });
