import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CARD_W = 1200;
const CARD_H = 630;

/** Waveform bar heights (0–100) — static decorative shape */
const BARS = [35, 60, 45, 80, 50, 95, 65, 75, 55, 85, 40, 70, 60, 50, 35];

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  const { songId } = await params;

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      title: true,
      imageUrl: true,
      isPublic: true,
      isHidden: true,
      archivedAt: true,
      user: { select: { name: true } },
    },
  });

  if (!song || !song.isPublic || song.isHidden || song.archivedAt) {
    return new Response("Not found", { status: 404 });
  }

  const title = song.title ?? "Untitled";
  const artist = song.user.name ?? "Unknown Artist";
  const coverArtData = song.imageUrl
    ? await fetchImageAsDataUrl(song.imageUrl)
    : null;

  const titleFontSize = title.length > 40 ? 42 : title.length > 25 ? 52 : 62;

  return new ImageResponse(
    (
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          display: "flex",
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 100%)",
          fontFamily: "sans-serif",
          padding: 60,
          gap: 60,
          alignItems: "center",
        }}
      >
        {/* Cover art */}
        <div
          style={{
            width: 510,
            height: 510,
            borderRadius: 24,
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1e1e3a",
            border: "2px solid #2d2d5a",
          }}
        >
          {coverArtData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverArtData}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ fontSize: 140, display: "flex" }}>🎵</div>
          )}
        </div>

        {/* Text + waveform */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 0,
          }}
        >
          {/* Brand */}
          <div
            style={{
              color: "#8b5cf6",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 32,
            }}
          >
            SUNOFLOW
          </div>

          {/* Title */}
          <div
            style={{
              color: "#ffffff",
              fontSize: titleFontSize,
              fontWeight: 800,
              lineHeight: 1.15,
              wordBreak: "break-word",
              marginBottom: 20,
            }}
          >
            {title}
          </div>

          {/* Artist */}
          <div
            style={{
              color: "#a78bfa",
              fontSize: 28,
              fontWeight: 500,
              marginBottom: 40,
            }}
          >
            by {artist}
          </div>

          {/* Waveform */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: "auto",
            }}
          >
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: Math.round(h * 1.4),
                  borderRadius: 4,
                  background:
                    i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#7c3aed" : "#6d28d9",
                  opacity: 0.9,
                }}
              />
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              color: "#4b5563",
              fontSize: 18,
              marginTop: 32,
            }}
          >
            sunoflow.app
          </div>
        </div>
      </div>
    ),
    {
      width: CARD_W,
      height: CARD_H,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    }
  );
}
