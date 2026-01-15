import type { Bookmark } from "@/types/bookmark";

/**
 * 相似度匹配结果
 */
interface MatchResult {
  matches: boolean;
  score: number;
}

/**
 * 计算字符串的模糊匹配分数
 * @param text 要搜索的文本
 * @param query 搜索查询（已小写化）
 * @param queryChars 搜索查询的字符数组（不含空格）
 * @returns 匹配结果，包含是否匹配和分数
 */
function calculateTextScore(
  text: string,
  query: string,
  queryChars: string[]
): MatchResult {
  if (!text) {
    return { matches: false, score: 0 };
  }

  const normalizedText = text.toLowerCase();
  let score = 0;

  // 精确匹配（最高分）
  if (normalizedText === query) {
    return { matches: true, score: 1000 };
  }

  // 直接包含匹配
  if (normalizedText.includes(query)) {
    score += 100;

    // 前缀匹配额外加分
    if (normalizedText.startsWith(query)) {
      score += 50;
    }

    // 单词边界匹配加分（查询出现在单词开头）
    const wordBoundaryRegex = new RegExp(`(^|[\\s\\-_/])${escapeRegex(query)}`);
    if (wordBoundaryRegex.test(normalizedText)) {
      score += 30;
    }

    // 匹配位置越靠前，分数越高
    const position = normalizedText.indexOf(query);
    score += Math.max(0, 20 - position);

    return { matches: true, score };
  }

  // 模糊匹配：检查查询字符是否按顺序出现在文本中
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  let lastMatchIndex = -1;

  for (let i = 0; i < normalizedText.length && queryIndex < queryChars.length; i++) {
    if (normalizedText[i] === queryChars[queryIndex]) {
      // 计算连续匹配
      if (lastMatchIndex === i - 1) {
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      } else {
        consecutiveMatches = 1;
      }

      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // 检查是否所有字符都匹配
  if (queryIndex === queryChars.length) {
    // 基础分数
    score += 10;

    // 连续匹配加分
    score += maxConsecutive * 5;

    // 匹配字符占文本的比例加分
    const matchRatio = queryChars.length / normalizedText.length;
    score += Math.floor(matchRatio * 20);

    return { matches: true, score };
  }

  return { matches: false, score: 0 };
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 计算书签的相似度分数
 * @param bookmark 书签
 * @param query 搜索查询（已小写化）
 * @param queryChars 搜索查询的字符数组（不含空格）
 * @returns 匹配结果，包含是否匹配和分数
 */
function calculateBookmarkScore(
  bookmark: Bookmark,
  query: string,
  queryChars: string[]
): MatchResult {
  // 使用 search_title 或 title 进行标题匹配
  const titleToSearch = bookmark.search_title || bookmark.title;
  const titleResult = calculateTextScore(titleToSearch, query, queryChars);

  // URL 匹配（权重较低）
  const urlResult = calculateTextScore(bookmark.url, query, queryChars);

  // 标签匹配
  let bestTagResult: MatchResult = { matches: false, score: 0 };
  for (const tag of bookmark.tags) {
    const tagResult = calculateTextScore(tag, query, queryChars);
    if (tagResult.score > bestTagResult.score) {
      bestTagResult = tagResult;
    }
  }

  // 综合计算分数
  // 标题权重最高，标签次之，URL最低
  const totalScore =
    titleResult.score * 3 + // 标题权重 x3
    bestTagResult.score * 2 + // 标签权重 x2
    urlResult.score * 1; // URL 权重 x1

  const matches = titleResult.matches || urlResult.matches || bestTagResult.matches;

  return { matches, score: totalScore };
}

/**
 * 更高级的模糊搜索（支持相似度匹配和排序）
 * 可以匹配部分字符，即使顺序不完全一致
 * 返回按相似度降序排列的结果
 */
export function fuzzySearch(bookmarks: Bookmark[], query: string): Bookmark[] {
  if (!query.trim()) {
    return bookmarks;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const queryChars = normalizedQuery.split("").filter((char) => char !== " ");

  // 计算每个书签的匹配分数
  const scoredBookmarks = bookmarks
    .map((bookmark) => {
      const result = calculateBookmarkScore(bookmark, normalizedQuery, queryChars);
      return {
        bookmark,
        matches: result.matches,
        score: result.score,
      };
    })
    .filter((item) => item.matches);

  // 按分数降序排序
  scoredBookmarks.sort((a, b) => b.score - a.score);

  // 返回排序后的书签
  return scoredBookmarks.map((item) => item.bookmark);
}
