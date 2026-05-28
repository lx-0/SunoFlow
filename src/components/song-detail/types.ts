export interface SongTag {
  id: string;
  name: string;
  color: string;
}

export interface VariationSummary {
  id: string;
  title: string | null;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  lyrics: string | null;
  generationStatus: string;
  isInstrumental: boolean;
  createdAt: string | Date;
}
