import { describe, expect, it } from "vitest";
import { mapRawSong, resolveClipAudioUrl } from "./mappers";

describe("resolveClipAudioUrl", () => {
  it("prefers sourceAudioUrl (permanent cdn) over audio_url (expiring tempfile)", () => {
    const url = resolveClipAudioUrl({
      id: "abc",
      sourceAudioUrl: "https://cdn1.suno.ai/abc.mp3",
      audio_url: "https://tempfile.aiquickdraw.com/r/deadbeef.mp3",
    });
    expect(url).toBe("https://cdn1.suno.ai/abc.mp3");
  });

  it("falls through to audio_url / audioUrl when no source url", () => {
    expect(resolveClipAudioUrl({ id: "abc", audio_url: "https://x/y.mp3" })).toBe("https://x/y.mp3");
    expect(resolveClipAudioUrl({ id: "abc", audioUrl: "https://x/z.mp3" })).toBe("https://x/z.mp3");
  });

  it("derives cdn1.suno.ai/<id>.mp3 when the aggregator returns SUCCESS with all URL fields null", () => {
    // Exact shape observed live 2026-07-08 for the 4 "ready but unplayable" songs.
    const raw = {
      id: "62096bc2-4809-4343-aac3-ed7097eb29aa",
      title: "Hammer Time (Ironic Edit) (by Ken)",
      duration: 129.4,
      audioUrl: null,
      sourceAudioUrl: null,
      streamAudioUrl: "https://musicfile.removeai.ai/NjIwOTZiYzI",
      imageUrl: "https://musicfile.removeai.ai/NjIwOTZiYzI.jpeg",
      modelName: "chirp-fenix",
    };
    expect(resolveClipAudioUrl(raw)).toBe(
      "https://cdn1.suno.ai/62096bc2-4809-4343-aac3-ed7097eb29aa.mp3",
    );
  });

  it("never treats the zero-byte streamAudioUrl as playable audio", () => {
    const url = resolveClipAudioUrl({
      id: "abc",
      audioUrl: null,
      sourceAudioUrl: null,
      streamAudioUrl: "https://musicfile.removeai.ai/abc",
    });
    expect(url).toBe("https://cdn1.suno.ai/abc.mp3");
    expect(url).not.toContain("removeai.ai");
  });

  it("returns empty string only when there is no clip id to derive from", () => {
    expect(resolveClipAudioUrl({ audioUrl: null, sourceAudioUrl: null })).toBe("");
  });
});

describe("mapRawSong audioUrl resolution", () => {
  it("maps a null-url SUCCESS clip to a playable derived audioUrl (regression: ready-but-unplayable)", () => {
    const song = mapRawSong({
      id: "62096bc2-4809-4343-aac3-ed7097eb29aa",
      title: "Hammer Time",
      duration: 129.4,
      audioUrl: null,
      sourceAudioUrl: null,
      imageUrl: "https://musicfile.removeai.ai/x.jpeg",
    });
    expect(song.audioUrl).toBe("https://cdn1.suno.ai/62096bc2-4809-4343-aac3-ed7097eb29aa.mp3");
    expect(song.imageUrl).toBe("https://musicfile.removeai.ai/x.jpeg");
    expect(song.duration).toBe(129.4);
  });
});
