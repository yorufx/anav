"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useResponsiveModal } from "@/hooks/use-responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import type { Bookmark, BookmarkProfile } from "@/types/bookmark";
import { updateProfile, setIcon } from "@/lib/api";
import { updateProfileTags } from "@/lib/bookmark-utils";
import { IconPicker } from "@/components/IconPicker";

export interface NewBookmarkDialogProps {
  /**
   * 触发按钮的内容
   */
  trigger: React.ReactNode;
  /**
   * 是否打开（受控模式）
   */
  open?: boolean;
  /**
   * 打开状态变化回调
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * 创建成功回调
   */
  onSuccess?: () => void;
  /**
   * 当前 profile 数据
   */
  profile: BookmarkProfile;
  /**
   * 编辑模式：要编辑的书签（如果提供则为编辑模式）
   */
  bookmark?: Bookmark;
}

export function NewBookmarkDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  profile,
  bookmark,
}: NewBookmarkDialogProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const { Modal, isMobile } = useResponsiveModal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchUrlError, setSearchUrlError] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);

  const isEditMode = !!bookmark;

  // 表单状态
  const [title, setTitle] = useState(bookmark?.title || "");
  const [url, setUrl] = useState(bookmark?.url || "");
  const [intranetUrl, setIntranetUrl] = useState(bookmark?.intranet_url || "");
  const [tags, setTags] = useState<string[]>(bookmark?.tags || []);
  const [searchTitle, setSearchTitle] = useState(bookmark?.search_title || "");
  const [searchUrl, setSearchUrl] = useState(bookmark?.search_url || "");

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  // 当打开编辑对话框时，填充表单数据
  useEffect(() => {
    if (isOpen && isEditMode && bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setIntranetUrl(bookmark.intranet_url || "");
      setTags(bookmark.tags || []);
      setSearchTitle(bookmark.search_title || "");
      setSearchUrl(bookmark.search_url || "");
      setIconFile(null); // 编辑模式下重置图标文件
    } else if (isOpen && !isEditMode) {
      // 新建模式：重置表单
      setTitle("");
      setUrl("");
      setIntranetUrl("");
      setTags([]);
      setSearchTitle("");
      setSearchUrl("");
      setIconFile(null);
    }
  }, [isOpen, isEditMode, bookmark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!title.trim() || !url.trim()) {
        setError(t("newBookmarkDialog.titleRequired"));
        setLoading(false);
        return;
      }

      const searchUrlTrimmed = searchUrl.trim();
      if (searchUrlTrimmed) {
        const placeholderCount = (searchUrlTrimmed.match(/\{\}/g) || []).length;
        if (placeholderCount === 0) {
          setSearchUrlError(t("newBookmarkDialog.searchUrlPlaceholderRequired"));
          setLoading(false);
          return;
        }
        if (placeholderCount > 1) {
          setSearchUrlError(t("newBookmarkDialog.searchUrlOnlyOnePlaceholder"));
          setLoading(false);
          return;
        }
      }
      setSearchUrlError("");

      if (isEditMode && bookmark) {
        // 编辑模式：更新现有书签
        const updatedBookmark: Bookmark = {
          ...bookmark,
          title: title.trim(),
          url: url.trim(),
          search_title: searchTitle.trim() || undefined,
          intranet_url: intranetUrl.trim() || undefined,
          search_url: searchUrl.trim() || undefined,
          tags: tags,
        };

        // 更新 profile 中的书签
        const updatedBookmarks = profile.bookmarks.map((b) =>
          b.id === bookmark.id ? updatedBookmark : b
        );

        // 更新 profile 并重新计算 tags
        const updatedProfile = updateProfileTags({
          ...profile,
          bookmarks: updatedBookmarks,
        });

        await updateProfile(updatedProfile);

        // 如果有上传的图标文件，上传图标
        if (iconFile) {
          await setIcon(bookmark.id, iconFile);
        }
      } else {
        // 创建模式：添加新书签
        const newBookmarkId = crypto.randomUUID();
        const newBookmark: Bookmark = {
          id: newBookmarkId,
          title: title.trim(),
          url: url.trim(),
          search_title: searchTitle.trim() || undefined,
          intranet_url: intranetUrl.trim() || undefined,
          search_url: searchUrl.trim() || undefined,
          tags: tags,
        };

        // 更新 profile 并重新计算 tags
        const updatedProfile = updateProfileTags({
          ...profile,
          bookmarks: [...profile.bookmarks, newBookmark],
        });

        await updateProfile(updatedProfile);

        // 如果有上传的图标文件，上传图标
        if (iconFile) {
          await setIcon(newBookmarkId, iconFile);
        }
      }

      // 重置表单
      if (!isEditMode) {
        setTitle("");
        setUrl("");
        setIntranetUrl("");
        setTags([]);
        setSearchTitle("");
        setSearchUrl("");
      }
      setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("newBookmarkDialog.createBookmarkFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      // 关闭时重置错误
      setError("");
      setSearchUrlError("");
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && <Modal.Trigger asChild>{trigger}</Modal.Trigger>}
      <Modal.Content
        className={isMobile ? "max-w-full px-4" : "sm:max-w-[500px]"}
      >
        <Modal.Header>
          <Modal.Title>
            {isEditMode
              ? t("newBookmarkDialog.editTitle")
              : t("newBookmarkDialog.createTitle")}
          </Modal.Title>
          <Modal.Description>
            {isEditMode
              ? t("newBookmarkDialog.editDesc")
              : t("newBookmarkDialog.createDesc")}
          </Modal.Description>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">
                {t("common.title")}{" "}
                <span className="text-destructive">{t("common.required")}</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("newBookmarkDialog.titlePlaceholder")}
                  required
                  disabled={loading}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="url">
                {t("common.url")}{" "}
                <span className="text-destructive">{t("common.required")}</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  disabled={loading}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="intranetUrl">
                {t("newBookmarkDialog.intranetUrl")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="intranetUrl"
                  type="url"
                  value={intranetUrl}
                  onChange={(e) => setIntranetUrl(e.target.value)}
                  placeholder={t("newBookmarkDialog.intranetUrlPlaceholder")}
                  disabled={loading}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="searchTitle">
                {t("newBookmarkDialog.searchTitle")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="searchTitle"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder={t("newBookmarkDialog.searchTitlePlaceholder")}
                  disabled={loading}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="searchUrl">
                {t("newBookmarkDialog.searchUrl")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="searchUrl"
                  type="url"
                  value={searchUrl}
                  onChange={(e) => {
                    setSearchUrl(e.target.value);
                    setSearchUrlError("");
                  }}
                  placeholder={t("newBookmarkDialog.searchUrlPlaceholder")}
                  disabled={loading}
                />
              </FieldContent>
              {searchUrlError && <FieldError>{searchUrlError}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("common.icon")}</FieldLabel>
              <FieldContent>
                <IconPicker
                  currentIcon={bookmark?.icon}
                  bookmarkUrl={url}
                  onIconChange={setIconFile}
                  disabled={loading}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("common.tags")}</FieldLabel>
              <FieldContent>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder={t("newBookmarkDialog.tagPlaceholder")}
                  disabled={loading}
                  suggestions={profile.tags}
                />
              </FieldContent>
            </Field>

            {error && (
              <Field>
                <FieldError>{error}</FieldError>
              </Field>
            )}
          </FieldGroup>

          {!isMobile && <div className="h-5"></div>}

          <Modal.Footer className="gap-2 flex-row">
            <Modal.Close asChild>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className={isMobile ? "flex-1" : ""}
              >
                {t("common.cancel")}
              </Button>
            </Modal.Close>
            <Button
              type="submit"
              disabled={loading}
              className={isMobile ? "flex-1" : ""}
            >
              {loading
                ? isEditMode
                  ? t("common.saving")
                  : t("common.creating")
                : isEditMode
                ? t("common.save")
                : t("common.create")}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
