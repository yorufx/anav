import React from "react";

/**
 * 高亮文本中的匹配关键词
 * @param text 要高亮的文本
 * @param query 搜索关键词（支持多关键词，空格分隔）
 * @returns React 节点
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const normalizedText = text;
  const lowerText = normalizedText.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  // 找到所有匹配的位置
  const matches: Array<{ start: number; end: number }> = [];

  // 方法1：尝试直接匹配（连续匹配）
  const directMatch = lowerText.indexOf(normalizedQuery);
  if (directMatch !== -1) {
    matches.push({
      start: directMatch,
      end: directMatch + normalizedQuery.length,
    });
  } else {
    // 方法2：字符序列匹配（模糊匹配）
    const queryChars = normalizedQuery.split("").filter((char) => char !== " ");
    if (queryChars.length > 0) {
      const fuzzyMatches = findFuzzyMatches(lowerText, queryChars);
      matches.push(...fuzzyMatches);
    }
  }

  // 如果没有匹配，返回原文本
  if (matches.length === 0) {
    return text;
  }

  // 合并重叠的匹配区间
  const mergedMatches = mergeMatches(matches);

  // 构建高亮后的文本
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mergedMatches.forEach((match) => {
    // 添加匹配前的文本
    if (match.start > lastIndex) {
      parts.push(text.substring(lastIndex, match.start));
    }

    // 添加高亮的匹配文本
    parts.push(
      <mark
        key={`${match.start}-${match.end}`}
        className="bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5"
      >
        {text.substring(match.start, match.end)}
      </mark>
    );

    lastIndex = match.end;
  });

  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}

/**
 * 合并重叠的匹配区间
 */
function mergeMatches(
  matches: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (matches.length === 0) {
    return [];
  }

  // 按起始位置排序
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // 如果当前区间与上一个区间重叠或相邻，合并它们
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * 查找模糊匹配的位置
 */
function findFuzzyMatches(
  text: string,
  queryChars: string[]
): Array<{ start: number; end: number }> {
  const matches: Array<{ start: number; end: number }> = [];
  let textIndex = 0;

  while (textIndex < text.length) {
    let queryIndex = 0;
    let matchStart = -1;

    // 从当前位置开始查找匹配
    for (
      let i = textIndex;
      i < text.length && queryIndex < queryChars.length;
      i++
    ) {
      if (text[i] === queryChars[queryIndex]) {
        if (matchStart === -1) {
          matchStart = i;
        }
        queryIndex++;
      }
    }

    // 如果找到了完整匹配
    if (matchStart !== -1 && queryIndex === queryChars.length) {
      // 找到匹配的结束位置
      let matchEnd = matchStart;
      queryIndex = 0;
      for (
        let i = matchStart;
        i < text.length && queryIndex < queryChars.length;
        i++
      ) {
        if (text[i] === queryChars[queryIndex]) {
          queryIndex++;
          matchEnd = i + 1;
        }
      }
      matches.push({ start: matchStart, end: matchEnd });
      textIndex = matchEnd; // 继续从匹配结束位置查找
    } else {
      break; // 没有找到更多匹配
    }
  }

  return matches;
}
