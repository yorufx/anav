import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableTagButtonProps {
  tag: string;
  selected: boolean;
  onClick: () => void;
}

export function SortableTagButton({
  tag,
  selected,
  onClick,
}: SortableTagButtonProps) {
  const { t } = useTranslation();
  const isDraggable = tag !== t("common.all");
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
      className={cn(
        isDraggable && "cursor-grab active:cursor-grabbing",
        isDragging && "z-50"
      )}
    >
      <Button
        variant={selected ? "default" : "outline"}
        size="sm"
        onClick={onClick}
        style={{
          pointerEvents: isDragging ? "none" : "auto",
        }}
      >
        {tag}
      </Button>
    </div>
  );
}
