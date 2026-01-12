import type { Bookmark, BookmarkProfile } from "@/types/bookmark";

/**
 * Calculate and update tags based on the bookmarks list
 * - 收集所有书签使用的 tags
 * - Remove tags that are not used by any bookmarks
 * - Add new tags that appear
 *
 * @param bookmarks The bookmarks list
 * @param existingTags The existing tags list (used to preserve order)
 * @returns The updated tags array (preserving original order, new tags added to the end)
 */
export function computeTagsFromBookmarks(
  bookmarks: Bookmark[],
  existingTags: string[] = []
): string[] {
  // 收集所有书签使用的 tags
  const usedTags = new Set<string>();

  for (const bookmark of bookmarks) {
    if (bookmark.tags && bookmark.tags.length > 0) {
      for (const tag of bookmark.tags) {
        if (tag.trim()) {
          usedTags.add(tag.trim());
        }
      }
    }
  }

  // Preserve original order: first add tags that are still used (in original order)
  const result: string[] = [];
  const addedTags = new Set<string>();

  for (const tag of existingTags) {
    if (usedTags.has(tag)) {
      result.push(tag);
      addedTags.add(tag);
    }
  }

  // Add new tags to the end
  for (const tag of usedTags) {
    if (!addedTags.has(tag)) {
      result.push(tag);
    }
  }

  return result;
}

/**
 * Update profile tags based on the current bookmarks list
 *
 * @param profile The profile to update
 * @returns The updated profile (tags updated)
 */
export function updateProfileTags(profile: BookmarkProfile): BookmarkProfile {
  const updatedTags = computeTagsFromBookmarks(profile.bookmarks, profile.tags);

  return {
    ...profile,
    tags: updatedTags,
  };
}
