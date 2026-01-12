import * as React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TagInputProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  /**
   * 当前标签列表
   */
  value: string[];
  /**
   * 标签变化回调
   */
  onChange: (tags: string[]) => void;
  /**
   * 占位符文本
   */
  placeholder?: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 可选的标签建议列表
   */
  suggestions?: string[];
}

export function TagInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  suggestions = [],
  className,
  ...props
}: TagInputProps) {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder || t("newBookmarkDialog.tagPlaceholder");
  const [inputValue, setInputValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 过滤建议：排除已添加的标签
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue.trim()) return [];
    return suggestions.filter(
      (s) =>
        s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
    );
  }, [inputValue, suggestions, value]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // 删除最后一个标签
      removeTag(value[value.length - 1]);
    } else if (e.key === "," || e.key === "，") {
      // 支持逗号分隔
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="relative" {...props}>
      <div
        onClick={handleContainerClick}
        className={cn(
          "flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs transition-[color,box-shadow] md:text-sm",
          "dark:bg-input/30",
          isFocused && "border-ring ring-ring/50 ring-[3px]",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className
        )}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1 shrink-0">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // 失焦时如果有输入内容，自动添加
            if (inputValue.trim()) {
              addTag(inputValue);
            }
          }}
          placeholder={value.length === 0 ? defaultPlaceholder : ""}
          disabled={disabled}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
        />
      </div>

      {isFocused && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
