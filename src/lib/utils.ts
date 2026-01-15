import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 检测输入是否为 URL
 * @param input 用户输入
 * @returns 如果是 URL 则返回完整的 URL，否则返回 null
 */
export function detectUrl(input: string): string | null {
  const trimmed = input.trim();

  // 空输入不处理
  if (!trimmed) {
    return null;
  }

  // 完整的 URL（以 http:// 或 https:// 开头）
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // 以常见协议开头但没有 scheme 的情况
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // 端口号正则：1-65535
  const portPattern =
    "(?::(?:6553[0-5]|655[0-2]\\d|65[0-4]\\d{2}|6[0-4]\\d{3}|[1-5]\\d{4}|[1-9]\\d{0,3}|0))?";

  // 检查是否为有效的域名或 IP 地址（支持可选端口）
  // 匹配类似: google.com, www.google.com, 192.168.1.1, localhost, example.com:8080, 192.168.1.1:3000 等
  const domainPattern = new RegExp(
    `^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}|(?:\\d{1,3}\\.){3}\\d{1,3}|localhost)${portPattern}$`,
    "i"
  );

  if (domainPattern.test(trimmed)) {
    // 添加 https:// 前缀
    return `https://${trimmed}`;
  }

  return null;
}

/**
 * 检查输入是否可能是一个搜索查询而不是 URL
 * @param input 用户输入
 * @returns 如果可能是搜索查询则返回 true
 */
export function isLikelySearchQuery(input: string): boolean {
  const trimmed = input.trim();

  // 包含空格，很可能是搜索
  if (trimmed.includes(" ")) {
    return true;
  }

  // 包含多个关键词（用逗号、分号等分隔）
  if (/[,;]/.test(trimmed)) {
    return true;
  }

  // 以问号开头（常见搜索模式）
  if (trimmed.startsWith("?")) {
    return true;
  }

  // 长度很短（1-2个字符）且不是有效的域名字符串
  if (trimmed.length <= 2 && !/^[a-zA-Z]{2,}$/.test(trimmed)) {
    return true;
  }

  return false;
}
