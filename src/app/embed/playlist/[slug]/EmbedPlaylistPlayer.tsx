"use client";

import { useRef, useState, useCallback } from "react";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
} from "@heroicons/react/24/solid";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface EmbedSong {
  id: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
}

interface EmbedPlaylistPlayerProps {
  name: string;
  creatorName: string;
  songs: EmbedSong[];
}

export function EmbedPlaylistPlayer({
  name,
  creatorName,
  songs,
}: EmbedPlaylistPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const playableSongs = songs.filter((s) => s.audioUrl);
  const currentSong = currentIndex >= 0 ? playableSongs[currentIndex] : null;

  const playSong = useCallback(
    (index: number) => {
      const song = playableSongs[index];
      if (!song?.audioUrl || !audioRef.current) return;
      setCurrentIndex(index);
      audioRef.current.src = song.audioUrl;
      audioRef.current.play().catch(console.error);
    },
    [playableSongs]
  );

  function handleTogglePlay() {
    if (!audioRef.current) return;
    if (currentIndex === -1 && playableSongs.length > 0) {
      playSong(0);
    } else if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }

  function handleNext() {
    if (currentIndex < playableSongs.length - 1) {
      playSong(currentIndex + 1);
    }
  }

  function handlePrev() {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (currentIndex > 0) {
      playSong(currentIndex - 1);
    }
  }

  function handleEnded() {
    if (currentIndex < playableSongs.length - 1) {
      playSong(currentIndex + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(-1);
      setCurrentTime(0);
    }
  }

  function handleSeek(pct: number) {
    if (!audioRef.current || audioDuration <= 0) return;
    audioRef.current.currentTime = pct * audioDuration;
  }

  const pct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex flex-col h-screen min-h-[200px] p-3 gap-2">
      {/* Header: playlist name + track info */}
      <div className="flex-shrink-0">
        <h1 className="text-sm font-bold truncate">{name}</h1>
        <p className="text-xs text-gray-400 truncate">
          {currentSong
            ? currentSong.title ?? "Untitled"
            : `${playableSongs.length} tracks · ${creatorName}`}
        </p>
      </div>

      {/* Track list (scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
        {songs.map((song, index) => {
          const playableIdx = playableSongs.findIndex(
            (s) => s.id === song.id
          );
          const isActive = playableIdx === currentIndex && currentIndex >= 0;

          return (
            <button
              key={song.id}
              onClick={() => {
                if (playableIdx === -1) return;
                if (playableIdx === currentIndex) {
                  handleTogglePlay();
                } else {
                  playSong(playableIdx);
                }
              }}
              disabled={!song.audioUrl}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                isActive
                  ? "bg-violet-600/20 text-violet-300"
                  : "hover:bg-white/5 text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
              }`}
            >
              <span className="w-5 text-center text-gray-500 flex-shrink-0">
                {isActive && isPlaying ? "▶" : index + 1}
              </span>
              <span className="flex-1 truncate">
                {song.title ?? "Untitled"}
              </span>
              {song.duration && (
                <span className="flex-shrink-0 text-gray-500">
                  {formatTime(song.duration)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0">
        <div className="relative h-1 bg-gray-800 rounded-full">
          <div
            className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => handleSeek(Number(e.target.value) / 100)}
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full opacity-0 cursor-pointer min-h-[44px]"
            aria-label="Seek"
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3">
        <button
          onClick={handlePrev}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Previous"
        >
          <BackwardIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleTogglePlay}
          className="w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5 ml-0.5" />
          )}
        </button>
        <button
          onClick={handleNext}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Next"
        >
          <ForwardIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() =>
          setAudioDuration(audioRef.current?.duration ?? 0)
        }
      />
    </div>
  );
}
