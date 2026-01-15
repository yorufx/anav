import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Search, Globe, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchDropdown } from "@/components/SearchDropdown";
import { Kbd } from "@/components/ui/kbd";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { Bookmark } from "@/types/bookmark";
import { iconUrl } from "@/lib/api";
import { detectUrl } from "@/lib/utils";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onUrlDetected?: (url: string) => void; // 当检测到 URL 时触发
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  searchResults?: Bookmark[];
  onSelectResult?: (bookmark: Bookmark) => void;
  onSelectedBookmarkChange?: (bookmark: Bookmark | null) => void;
  hasBackground?: boolean;
  useIntranetUrl?: boolean;
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  onUrlDetected,
  placeholder,
  className,
  autoFocus = true,
  searchResults = [],
  onSelectResult,
  onSelectedBookmarkChange,
  hasBackground = false,
  useIntranetUrl = false,
}: SearchBoxProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(
    null
  );
  const [iconError, setIconError] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // 检测是否为 URL
  const detectedUrl = value.trim() ? detectUrl(value) : null;
  const isUrlMode = detectedUrl !== null && !selectedBookmark;

  // 手机模式下不显示 placeholder
  const defaultPlaceholder = isMobile
    ? ""
    : selectedBookmark
    ? t("searchBox.searchInBookmark", { title: selectedBookmark.title })
    : isUrlMode
    ? t("searchBox.urlDetected")
    : placeholder || t("searchBox.placeholder");

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 监听全局点击事件，检测是否点击在搜索框外部
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setIsDropdownOpen(false);
      }
    };

    if (isFocused || isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFocused, isDropdownOpen]);

  // 当搜索结果变化时，重置选中索引和下拉框状态
  // 下拉框显示条件：聚焦 + 有搜索关键词 + 有搜索结果 + 没有选中书签 + 不是 URL 模式
  const shouldShowDropdown =
    isFocused &&
    value.trim().length > 0 &&
    searchResults.length > 0 &&
    !selectedBookmark &&
    !isUrlMode;

  useEffect(() => {
    // 使用 setTimeout 避免同步 setState
    const timer = setTimeout(() => {
      if (shouldShowDropdown) {
        setSelectedIndex(0);
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [value, searchResults.length, shouldShowDropdown, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 如果检测到 URL，直接跳转
    if (detectedUrl) {
      onUrlDetected?.(detectedUrl);
      window.location.href = detectedUrl;
      return;
    }

    // 否则执行搜索
    onSubmit?.(e);
  };

  // 根据内网状态决定使用哪个链接
  const getBookmarkUrl = useCallback(
    (bookmark: Bookmark): string => {
      return useIntranetUrl && bookmark.intranet_url
        ? bookmark.intranet_url
        : bookmark.url;
    },
    [useIntranetUrl]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 如果已选中书签，处理 Backspace 和 Tab 键
    if (selectedBookmark) {
      if (e.key === "Backspace" && value === "") {
        e.preventDefault();
        setSelectedBookmark(null);
        onSelectedBookmarkChange?.(null);
        setIconError(false);
        return;
      }
      if (e.key === "Tab" && value === "") {
        e.preventDefault();
        // Tab：打开选中的书签网页
        window.location.href = getBookmarkUrl(selectedBookmark);
        return;
      }
      // 如果已选中书签，不处理其他键（除了 Backspace 和 Tab）
      return;
    }

    // 如果没有选中书签，处理下拉框的键盘操作
    if (!isDropdownOpen || searchResults.length === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case "Tab":
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          e.preventDefault();
          const selected = searchResults[selectedIndex];

          if (selected.search_url) {
            // Tab：选中该书签作为搜索引擎，清空搜索内容
            setSelectedBookmark(selected);
            onSelectedBookmarkChange?.(selected);
            onChange(""); // 清空搜索内容
            setIsDropdownOpen(false);
            setIconError(false);
          } else {
            // 没有 search_url：直接进入网页
            onSelectResult?.(selected);
            window.location.href = getBookmarkUrl(selected);
            setIsDropdownOpen(false);
          }
        }
        break;
      case "Escape":
        setIsDropdownOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (bookmark: Bookmark) => {
    onSelectResult?.(bookmark);
    // 点击直接进入网页
    window.location.href = getBookmarkUrl(bookmark);
    setIsDropdownOpen(false);
    onChange(""); // 清空搜索框
    setSelectedBookmark(null);
    onSelectedBookmarkChange?.(null);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div ref={containerRef} className="relative">
        {/* 图标：如果选中了书签，显示书签图标；如果检测到 URL，显示链接图标；否则显示搜索图标 */}
        {selectedBookmark ? (
          selectedBookmark.icon && !iconError ? (
            <img
              src={iconUrl(selectedBookmark.icon)}
              alt={selectedBookmark.title}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-5 object-contain z-10"
              onError={() => setIconError(true)}
            />
          ) : (
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground z-10" />
          )
        ) : isUrlMode ? (
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary z-10" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground z-10" />
        )}
        <Input
          ref={inputRef}
          type="text"
          placeholder={defaultPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (
              value.trim().length > 0 &&
              searchResults.length > 0 &&
              !selectedBookmark
            ) {
              setIsDropdownOpen(true);
            }
          }}
          onBlur={() => {}}
          className={cn(
            "h-14 pl-12 pr-4 text-lg rounded-xl",
            hasBackground &&
              "bg-background/70! dark:bg-background/70! backdrop-blur-sm border-border/50"
          )}
        />
        {/* 手机模式下不显示按键提示 */}
        {isFocused && !isMobile && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs text-muted-foreground">
            {selectedBookmark ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Kbd>Enter</Kbd>
                  <span>{t("searchBox.search")}</span>
                </div>
                {value === "" && (
                  <div className="flex items-center gap-1.5">
                    <Kbd>Tab</Kbd>
                    <span>
                      {t("searchBox.open", { title: selectedBookmark.title })}
                    </span>
                  </div>
                )}
              </>
            ) : isUrlMode ? (
              <div className="flex items-center gap-1.5">
                <Kbd>Enter</Kbd>
                <span>{t("searchBox.openUrl")}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Kbd>Enter</Kbd>
                  <span>{t("searchBox.search")}</span>
                </div>
                {value.trim().length > 0 && searchResults.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Kbd>Tab</Kbd>
                    <span>
                      {searchResults[selectedIndex]?.search_url
                        ? t("searchBox.useBookmarkSearch", {
                            title: searchResults[selectedIndex].title,
                          })
                        : t("searchBox.openBookmark", {
                            title: searchResults[selectedIndex].title,
                          })}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <SearchDropdown
          results={searchResults}
          searchQuery={value}
          isOpen={isDropdownOpen}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          onClose={() => setIsDropdownOpen(false)}
          useIntranetUrl={useIntranetUrl}
        />
      </div>
    </form>
  );
}
