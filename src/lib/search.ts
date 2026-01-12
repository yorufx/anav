import type { Bookmark } from "@/types/bookmark";

/**
 * 更高级的模糊搜索（支持相似度匹配）
 * 可以匹配部分字符，即使顺序不完全一致
 */
export function fuzzySearch(bookmarks: Bookmark[], query: string): Bookmark[] {
  if (!query.trim()) {
    return bookmarks;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const queryChars = normalizedQuery.split("").filter((char) => char !== " ");

  return bookmarks.filter((bookmark) => {
    const searchableText = [
      bookmark.title,
      bookmark.url,
      ...bookmark.tags,
    ]
      .join(" ")
      .toLowerCase();

    // 方法1：直接包含匹配（快速）
    if (searchableText.includes(normalizedQuery)) {
      return true;
    }

    // 方法2：字符序列匹配（模糊匹配）
    // 检查查询字符串中的字符是否按顺序出现在搜索文本中
    let queryIndex = 0;
    for (
      let i = 0;
      i < searchableText.length && queryIndex < queryChars.length;
      i++
    ) {
      if (searchableText[i] === queryChars[queryIndex]) {
        queryIndex++;
      }
    }

    // 如果所有字符都按顺序找到了，则匹配
    return queryIndex === queryChars.length;
  });
}
