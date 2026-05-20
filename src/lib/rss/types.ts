export interface RssItem {
  title: string;
  description: string;
  content?: string;
  link?: string;
  source?: string;
  pubDate?: string;
  mood?: string;
  topics?: string[];
  suggestedStyle?: string;
  excerpt?: string;
  /** Inline feed content was a truncated summary (had a read-more marker) and
   *  must be backfilled by following the article link. */
  truncated?: boolean;
}

export interface FeedResult {
  url: string;
  feedTitle: string;
  items: RssItem[];
  error?: string;
}
