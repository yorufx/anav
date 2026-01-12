import { useEffect, useRef, useState } from "react";
import { Globe, ExternalLink, Search } from "lucide-react";
import type { Bookmark } from "@/types/bookmark";
import { highlightText } from "@/lib/highlight";
import { iconUrl } from "@/lib/api";

interface SearchDropdownProps {
  results: Bookmark[];
  searchQuery: string;
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (bookmark: Bookmark) => void;
  onClose: () => void;
  useIntranetUrl?: boolean;
}

function DropdownItem({
  bookmark,
  searchQuery,
  isSelected,
  onClick,
  itemRef,
  useIntranetUrl = false,
}: {
  bookmark: Bookmark;
  searchQuery: string;
  isSelected: boolean;
  onClick: () => void;
  itemRef: (el: HTMLAnchorElement | null) => void;
  useIntranetUrl?: boolean;
}) {
  const [iconError, setIconError] = useState(false);

  // 根据内网状态决定使用哪个链接
  const displayUrl =
    useIntranetUrl && bookmark.intranet_url
      ? bookmark.intranet_url
      : bookmark.url;

  return (
    <a
      href={displayUrl}
      ref={itemRef}
      className={`
        flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors no-underline text-foreground
        ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
      `}
      onMouseDown={(e) => {
        // Use onMouseDown instead of onClick to prevent the input box from blurring
        // But if Command/Ctrl+click or middle click, let the browser handle the default behavior
        if (e.button === 1 || e.metaKey || e.ctrlKey) {
          return; // Let the browser handle the new tab opening
        }
        e.preventDefault();
        onClick();
      }}
    >
      <div className="shrink-0">
        {bookmark.icon && !iconError ? (
          <img
            src={iconUrl(bookmark.icon)}
            alt={bookmark.title}
            className="size-6 object-contain"
            onError={() => setIconError(true)}
          />
        ) : (
          <Globe className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">
          {searchQuery
            ? highlightText(bookmark.title, searchQuery)
            : bookmark.title}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {displayUrl}
        </div>
      </div>
      {/* If search_url is set, show the search icon to indicate that the bookmark can be selected by pressing Tab; otherwise show the external link icon */}
      {bookmark.search_url ? (
        <Search className="size-4 text-muted-foreground shrink-0" />
      ) : (
        <ExternalLink className="size-4 text-muted-foreground shrink-0" />
      )}
    </a>
  );
}

export function SearchDropdown({
  results,
  searchQuery,
  isOpen,
  selectedIndex,
  onSelect,
  useIntranetUrl = false,
}: SearchDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // 滚动到选中项
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen || results.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
    >
      {results.map((bookmark, index) => (
        <DropdownItem
          key={bookmark.id}
          bookmark={bookmark}
          searchQuery={searchQuery}
          isSelected={index === selectedIndex}
          onClick={() => onSelect(bookmark)}
          itemRef={(el) => {
            itemRefs.current[index] = el;
          }}
          useIntranetUrl={useIntranetUrl}
        />
      ))}
    </div>
  );
}
