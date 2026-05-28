export interface TimestampedComment {
  id: string;
  timestamp: number;
  body: string;
  username: string | null;
}

export interface CommentPopup {
  id: string;
  body: string;
  username: string | null;
  key: number;
  leftPct: number;
}

export interface EmojiPopup {
  id: string;
  emoji: string;
  key: number;
  leftPct: number;
}
