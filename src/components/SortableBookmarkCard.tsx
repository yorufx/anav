import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookmarkCard } from "@/components/BookmarkCard";
import type { Bookmark } from "@/types/bookmark";
import { cn } from "@/lib/utils";

interface SortableBookmarkCardProps {
  bookmark: Bookmark;
  searchQuery?: string;
  useIntranetUrl?: boolean;
  hasBackground?: boolean;
  onEdit?: (bookmark: Bookmark) => void;
  onDelete?: (bookmark: Bookmark) => void;
}

export function SortableBookmarkCard({
  bookmark,
  searchQuery,
  useIntranetUrl,
  hasBackground,
  onEdit,
  onDelete,
}: SortableBookmarkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "z-50")}
    >
      <div
        style={{
          pointerEvents: isDragging ? "none" : "auto",
        }}
      >
        <BookmarkCard
          bookmark={bookmark}
          searchQuery={searchQuery}
          useIntranetUrl={useIntranetUrl}
          hasBackground={hasBackground}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
