import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iconUrl, fetchFavicon } from "@/lib/api";

interface IconPickerProps {
  /**
   * 当前图标文件名（如果有）
   */
  currentIcon?: string;
  /**
   * 书签 URL（用于自动获取图标）
   */
  bookmarkUrl?: string;
  /**
   * 图标变化回调
   */
  onIconChange?: (iconFile: File | null) => void;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 将 base64 数据转换为 File 对象
 */
function base64ToFile(base64: string, contentType: string, filename: string): File {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  return new File([blob], filename, { type: contentType });
}

export function IconPicker({
  currentIcon,
  bookmarkUrl,
  onIconChange,
  disabled = false,
}: IconPickerProps) {
  const { t } = useTranslation();
  const [userSelectedPreview, setUserSelectedPreview] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [iconOptions, setIconOptions] = useState<
    Array<{ url: string; file: File; previewUrl: string }>
  >([]);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 prop 计算默认预览（不触发 re-render）
  const defaultPreview = useMemo(
    () => (currentIcon ? iconUrl(currentIcon) : null),
    [currentIcon]
  );

  // 最终显示的预览：优先使用用户选择的，否则使用默认值
  const iconPreview = userSelectedPreview ?? defaultPreview;

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      // 清理所有图标选项的 blob URL
      iconOptions.forEach((option) => {
        URL.revokeObjectURL(option.previewUrl);
      });
    };
  }, [previewBlobUrl, iconOptions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("iconPicker.selectImageFile"));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(t("iconPicker.imageSizeExceeded"));
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserSelectedPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    onIconChange?.(file);
  };

  const handleFetchFromUrl = async () => {
    if (!bookmarkUrl?.trim()) {
      setError(t("iconPicker.fillUrlFirst"));
      return;
    }

    setIsLoading(true);
    setError("");
    setShowIconSelector(false);

    // 清理之前的图标选项
    iconOptions.forEach((option) => {
      URL.revokeObjectURL(option.previewUrl);
    });
    setIconOptions([]);

    try {
      // 通过后端代理获取 favicon，避免 CORS 问题
      const result = await fetchFavicon(bookmarkUrl);

      if (result.icons.length === 0) {
        setError(t("iconPicker.cannotGetIcon"));
        setIsLoading(false);
        return;
      }

      // 将 base64 数据转换为 File 对象
      const foundIcons: Array<{ url: string; file: File; previewUrl: string }> =
        result.icons.map((icon) => {
          const file = base64ToFile(
            icon.data,
            icon.content_type,
            "favicon.png"
          );
          const blob = new Blob(
            [Uint8Array.from(atob(icon.data), (c) => c.charCodeAt(0))],
            { type: icon.content_type }
          );
          const previewUrl = URL.createObjectURL(blob);
          return {
            url: icon.url,
            file,
            previewUrl,
          };
        });

      // 如果只找到一个图标，直接使用
      if (foundIcons.length === 1) {
        const selected = foundIcons[0];
        // 清理之前的 blob URL
        if (previewBlobUrl) {
          URL.revokeObjectURL(previewBlobUrl);
        }
        setPreviewBlobUrl(selected.previewUrl);
        setUserSelectedPreview(selected.previewUrl);
        onIconChange?.(selected.file);
        setIsLoading(false);
        return;
      }

      // 如果找到多个图标，显示选择界面
      setIconOptions(foundIcons);
      setShowIconSelector(true);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("iconPicker.fetchIconFailed"));
      setIsLoading(false);
    }
  };

  const handleSelectIcon = (option: {
    url: string;
    file: File;
    previewUrl: string;
  }) => {
    // 清理之前的 blob URL
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    // 清理所有未选中的图标选项的 blob URL
    iconOptions.forEach((opt) => {
      if (opt.url !== option.url) {
        URL.revokeObjectURL(opt.previewUrl);
      }
    });

    setPreviewBlobUrl(option.previewUrl);
    setUserSelectedPreview(option.previewUrl);
    onIconChange?.(option.file);
    setShowIconSelector(false);
    setIconOptions([]);
  };

  const handleCancelIconSelection = () => {
    // 清理所有图标选项的 blob URL
    iconOptions.forEach((option) => {
      URL.revokeObjectURL(option.previewUrl);
    });
    setIconOptions([]);
    setShowIconSelector(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {/* 图标预览 */}
        <div className="relative">
          <div className="size-16 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
            {iconPreview ? (
              <img
                src={iconPreview}
                alt={t("iconPicker.iconPreview")}
                className="size-full object-contain"
              />
            ) : (
              <Globe className="size-8 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full"
          >
            <Upload className="size-4 mr-2" />
            {t("iconPicker.uploadIcon")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFetchFromUrl}
            disabled={disabled || isLoading || !bookmarkUrl?.trim()}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Globe className="size-4 mr-2" />
            )}
            {t("iconPicker.fetchFromUrl")}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {error && <div className="text-sm text-destructive">{error}</div>}

      {showIconSelector && iconOptions.length > 0 && (
        <div className="mt-4 p-4 border border-border rounded-md bg-muted/50">
          <div className="text-sm font-medium mb-3">
            {t("iconPicker.foundIcons", { count: iconOptions.length })}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {iconOptions.map((option, index) => (
              <button
                key={option.url}
                type="button"
                onClick={() => handleSelectIcon(option)}
                className="p-2 border border-border rounded-md hover:border-primary hover:bg-accent transition-colors flex flex-col items-center gap-2"
                disabled={disabled}
              >
                <img
                  src={option.previewUrl}
                  alt={t("iconPicker.iconOption", { index: index + 1 })}
                  className="size-12 object-contain"
                />
                <span className="text-xs text-muted-foreground truncate w-full">
                  {t("iconPicker.iconOption", { index: index + 1 })}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelIconSelection}
              disabled={disabled}
            >
              {t("iconPicker.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
