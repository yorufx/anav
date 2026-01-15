import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Globe, Edit, Trash2, Link } from "lucide-react";
import { highlightText } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import type { Bookmark } from "@/types/bookmark";
import { iconUrl } from "@/lib/api";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface BookmarkCardProps {
  bookmark: Bookmark;
  /**
   * Search query for highlighting the title
   */
  searchQuery?: string;
  /**
   * 是否使用内网链接（如果有）
   */
  useIntranetUrl?: boolean;
  /**
   * 是否有背景图（有背景时卡片半透明）
   */
  hasBackground?: boolean;
  /**
   * 编辑回调
   */
  onEdit?: (bookmark: Bookmark) => void;
  /**
   * 删除回调
   */
  onDelete?: (bookmark: Bookmark) => void;
}

export function BookmarkCard({
  bookmark,
  searchQuery = "",
  useIntranetUrl = false,
  hasBackground = false,
  onEdit,
  onDelete,
}: BookmarkCardProps) {
  const { t } = useTranslation();
  const [iconError, setIconError] = useState(false);

  // 根据内网状态决定使用哪个链接
  const displayUrl =
    useIntranetUrl && bookmark.intranet_url
      ? bookmark.intranet_url
      : bookmark.url;

  const handleEdit = () => {
    onEdit?.(bookmark);
  };

  const handleDelete = () => {
    onDelete?.(bookmark);
  };

  // 获取另一个链接（如果当前显示内网链接则返回外网链接，反之亦然）
  const alternateUrl =
    useIntranetUrl && bookmark.intranet_url
      ? bookmark.url // 当前是内网链接，返回外网链接
      : bookmark.intranet_url; // 当前是外网链接，返回内网链接（可能为空）

  const handleOpenAlternate = () => {
    if (alternateUrl) {
      window.open(alternateUrl, "_blank");
    }
  };

  const cardContent = (
    <a
      href={displayUrl}
      className={cn(
        "group border rounded-lg p-3",
        "hover:shadow-md transition-all hover:scale-105",
        "flex items-center gap-2",
        "h-16",
        "no-underline text-foreground",
        "cursor-pointer",
        hasBackground
          ? "bg-background/70 backdrop-blur-sm border-border/50"
          : "bg-card border-border"
      )}
    >
      {bookmark.icon && !iconError ? (
        <img
          src={iconUrl(bookmark.icon)}
          alt={bookmark.title}
          className="size-7 object-contain rounded-md"
          onError={() => setIconError(true)}
        />
      ) : (
        <div className="p-1.5 rounded-md bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center size-7 shrink-0">
          <Globe className="size-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-medium truncate">
            {searchQuery
              ? highlightText(bookmark.title, searchQuery)
              : bookmark.title}
          </div>
          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {bookmark.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </a>
  );

  if (onEdit || onDelete || alternateUrl) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
        <ContextMenuContent>
          {alternateUrl && (
            <ContextMenuItem onClick={handleOpenAlternate}>
              <Link className="size-4 mr-2" />
              {useIntranetUrl && bookmark.intranet_url
                ? t("bookmarkCard.openExtranet")
                : t("bookmarkCard.openIntranet")}
            </ContextMenuItem>
          )}
          {alternateUrl && (onEdit || onDelete) && <ContextMenuSeparator />}
          {onEdit && (
            <ContextMenuItem onClick={handleEdit}>
              <Edit className="size-4 mr-2" />
              {t("bookmarkCard.edit")}
            </ContextMenuItem>
          )}
          {onEdit && onDelete && <ContextMenuSeparator />}
          {onDelete && (
            <ContextMenuItem onClick={handleDelete} variant="destructive">
              <Trash2 className="size-4 mr-2" />
              {t("bookmarkCard.delete")}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return cardContent;
}
