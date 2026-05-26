import { authDataRoute, authRoute, resultResponse } from "@/lib/route-handler";
import { getProfile, updateProfile, deleteAccount } from "@/lib/profile";
import { updateProfileBody, deleteAccountBody } from "@/lib/profile/request";

export const GET = authDataRoute(async (_request, { auth }) => {
  return resultResponse(await getProfile(auth.userId));
}, { route: "/api/profile" });

export const PATCH = authRoute(async (_request, { auth, body }) => {
  return resultResponse(await updateProfile(auth.userId, body));
}, { route: "/api/profile", body: updateProfileBody });

export const DELETE = authRoute(async (_request, { auth, body }) => {
  return resultResponse(await deleteAccount(auth.userId, body));
}, { route: "/api/profile", body: deleteAccountBody });
