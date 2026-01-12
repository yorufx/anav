"use client";

import { useTranslation } from "react-i18next";
import { useResponsiveModal } from "@/hooks/use-responsive-modal";
import { Button } from "@/components/ui/button";
import type { Bookmark } from "@/types/bookmark";

export interface DeleteBookmarkDialogProps {
  /**
   * 是否打开（受控模式）
   */
  open?: boolean;
  /**
   * 打开状态变化回调
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * 要删除的书签
   */
  bookmark: Bookmark | null;
  /**
   * 确认删除回调
   */
  onConfirm?: () => void;
}

export function DeleteBookmarkDialog({
  open,
  onOpenChange,
  bookmark,
  onConfirm,
}: DeleteBookmarkDialogProps) {
  const { t } = useTranslation();
  const { Modal, isMobile } = useResponsiveModal();

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  if (!bookmark) return null;

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={isMobile ? "max-w-full px-4" : "sm:max-w-[400px]"}
      >
        <Modal.Header>
          <Modal.Title>{t("deleteBookmarkDialog.title")}</Modal.Title>
          <Modal.Description>
            {t("deleteBookmarkDialog.message", { title: bookmark.title })}
          </Modal.Description>
        </Modal.Header>

        <Modal.Footer className="gap-2 flex-row">
          <Modal.Close asChild>
            <Button type="button" variant="outline" className={isMobile ? "flex-1" : ""}>
              {t("common.cancel")}
            </Button>
          </Modal.Close>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            className={isMobile ? "flex-1" : ""}
          >
            {t("common.delete")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
