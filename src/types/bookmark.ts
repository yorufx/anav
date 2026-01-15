/**
 * Bookmark type definition
 */
export interface Bookmark {
  id: string;
  title: string;
  search_title?: string;
  url: string;
  intranet_url?: string;
  search_url?: string;
  icon?: string;
  tags: string[];
}

export type ImageOrientation = "Landscape" | "Portrait";

export interface BackgroundImage {
  id: string;
  filename: string;
  orientation: ImageOrientation;
}

export interface BookmarkProfile {
  name: string;
  bookmarks: Bookmark[];
  tags: string[];
  search_engine: string;
  intranet_check_url?: string;
  background_images?: BackgroundImage[];
  /** Version UUID for optimistic concurrency control */
  version?: string;
}
