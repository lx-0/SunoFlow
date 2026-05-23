import { NextResponse } from "next/server";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { Tags } from "@/lib/tags";
import {
  addSongTagBodySchema,
  type AddSongTagBody,
} from "@/lib/tags/request";

export const GET = authRoute<{ id: string }>(async (_request, { auth, params }) => {
  const result = await Tags.listForSong(auth.userId, params.id);
  if (!result.ok) return resultResponse(result);
  return NextResponse.json({ tags: result.data });
}, { route: "/api/songs/[id]/tags" });

export const POST = authRoute<{ id: string }, AddSongTagBody>(async (
  _request,
  { auth, params, body },
) => {
  const result = await Tags.addToSong(auth.userId, params.id, {
    tagId: body.tagId,
    name: body.name,
  });
  if (!result.ok) return resultResponse(result);
  const { tag, created } = result.data;
  return NextResponse.json({ tag }, { status: created ? 201 : 200 });
}, {
  route: "/api/songs/[id]/tags",
  body: addSongTagBodySchema,
});
