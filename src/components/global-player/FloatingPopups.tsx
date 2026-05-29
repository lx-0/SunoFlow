import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import type { EmojiPopup, CommentPopup } from "./types";

export function FloatingPopups({
  emojiPopups,
  commentPopups,
}: {
  emojiPopups: EmojiPopup[];
  commentPopups: CommentPopup[];
}) {
  return (
    <>
      {emojiPopups.length > 0 && (
        <div className="pointer-events-none absolute inset-x-2 bottom-14 h-0 z-30">
          {emojiPopups.map((popup) => (
            <span
              key={popup.key}
              className="absolute text-2xl leading-none animate-emoji-float"
              style={{ left: `${popup.leftPct}%` }}
              aria-hidden="true"
            >
              {popup.emoji}
            </span>
          ))}
        </div>
      )}

      {commentPopups.length > 0 && (
        <div className="pointer-events-none absolute inset-x-2 bottom-14 h-0 z-10">
          {commentPopups.map((popup) => (
            <div
              key={popup.key}
              className="absolute bottom-2 flex flex-col items-center gap-0.5 animate-emoji-float"
              style={{
                left: `${popup.leftPct}%`,
                transform: "translateX(-50%)",
              }}
              aria-hidden="true"
            >
              <div className="bg-gray-800/90 border border-violet-500/50 text-white text-xs px-2 py-1 rounded-lg shadow-lg max-w-[160px] text-center leading-tight">
                {popup.username && (
                  <span className="block text-[10px] text-violet-400 font-medium truncate">
                    {popup.username}
                  </span>
                )}
                <span className="line-clamp-2">{popup.body}</span>
              </div>
              <ChatBubbleLeftIcon className="w-3 h-3 text-violet-400" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
