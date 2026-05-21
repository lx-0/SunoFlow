import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

// Excludes visually ambiguous characters (I, L, O, 0, 1).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SEGMENTS = 2;
const SEGMENT_LENGTH = 4;

export function generateInviteCode(): string {
  const segments: string[] = [];
  for (let s = 0; s < SEGMENTS; s++) {
    let segment = "";
    for (let i = 0; i < SEGMENT_LENGTH; i++) {
      segment += ALPHABET[randomInt(ALPHABET.length)];
    }
    segments.push(segment);
  }
  return segments.join("-");
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export type InviteValidation =
  | { ok: true; id: string }
  | { ok: false; reason: "missing" | "invalid" };

export async function validateInviteCode(raw: string | undefined): Promise<InviteValidation> {
  const code = raw ? normalizeInviteCode(raw) : "";
  if (!code) return { ok: false, reason: "missing" };

  const found = await prisma.inviteCode.findUnique({ where: { code } });
  if (
    !found ||
    found.usedByUserId !== null ||
    (found.expiresAt !== null && found.expiresAt.getTime() < Date.now())
  ) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, id: found.id };
}
