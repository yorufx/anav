"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useResponsiveModal } from "@/hooks/use-responsive-modal";
import {
  logout,
  getAllProfileNames,
  getProfile,
  createProfile,
  deleteProfile,
  renameProfile,
  sortProfiles,
  updateProfile,
  uploadBackgroundImage,
  getBackgroundImages,
  deleteBackgroundImage,
  backgroundImageUrl,
} from "@/lib/api";
import type { BackgroundImageInfo } from "@/lib/api";
import {
  useClearAll,
  useCurrentProfile,
  useSetCurrentProfile,
} from "@/lib/store";
import type { BookmarkProfile } from "@/types/bookmark";
import {
  ArrowLeft,
  LogOut,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import packageJson from "../../package.json";

// 内置搜索引擎选项 - 需要在组件内使用 t() 函数
function getSearchEnginePresets(t: (key: string) => string) {
  return [
    {
      value: "google",
      label: t("settingsPage.searchEngines.google"),
      url: "https://www.google.com/search?q={}",
    },
    {
      value: "baidu",
      label: t("settingsPage.searchEngines.baidu"),
      url: "https://www.baidu.com/s?wd={}",
    },
    {
      value: "bing",
      label: t("settingsPage.searchEngines.bing"),
      url: "https://www.bing.com/search?q={}",
    },
    {
      value: "custom",
      label: t("settingsPage.searchEngines.custom"),
      url: "",
    },
  ];
}

// 根据 URL 获取搜索引擎类型
function getSearchEngineType(url: string, t: (key: string) => string): string {
  const presets = getSearchEnginePresets(t);
  const preset = presets.find((p) => p.url === url);
  return preset?.value || "custom";
}

// 可排序的 Profile 项
function SortableProfileItem({
  name,
  isActive,
  onEdit,
  onDelete,
  onSelect,
}: {
  name: string;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer
        ${isDragging ? "opacity-50 bg-muted" : ""}
        ${
          isActive
            ? "border-primary bg-primary/5"
            : "border-border hover:bg-muted/50"
        }
      `}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 text-left font-medium">
        {name}
        {isActive && (
          <span className="ml-2 text-xs text-primary">
            {t("common.current")}
          </span>
        )}
      </div>
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" onClick={onEdit} className="size-8">
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// Profile 保存参数
interface ProfileSaveParams {
  name: string;
  searchEngine: string;
  intranetCheckUrl?: string;
  originalName?: string; // 原始名称，用于判断是否需要改名
}

// 新建/编辑 Profile 对话框
function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
  isNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: BookmarkProfile | null;
  onSave: (params: ProfileSaveParams) => Promise<void>;
  isNew: boolean;
}) {
  const { t } = useTranslation();
  const { Modal, isMobile } = useResponsiveModal();
  const [name, setName] = useState("");
  const [searchEngineType, setSearchEngineType] = useState("google");
  const [customSearchEngine, setCustomSearchEngine] = useState("");
  const [intranetCheckUrl, setIntranetCheckUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backgroundImages, setBackgroundImages] = useState<
    BackgroundImageInfo[]
  >([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]); // 待上传的图片文件
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]); // 待删除的图片 ID

  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      const type = getSearchEngineType(profile.search_engine, t);
      setSearchEngineType(type);
      if (type === "custom") {
        setCustomSearchEngine(profile.search_engine);
      } else {
        setCustomSearchEngine("");
      }
      setIntranetCheckUrl(profile.intranet_check_url || "");
      // 加载背景图列表
      loadBackgroundImages(profile.name);
      setPendingImages([]); // 重置待上传图片
      setPendingDeletes([]); // 重置待删除图片
    } else if (open && isNew) {
      setName("");
      setSearchEngineType("google");
      setCustomSearchEngine("");
      setIntranetCheckUrl("");
      setBackgroundImages([]);
      setPendingImages([]);
      setPendingDeletes([]);
    }
    setError("");
  }, [open, profile, isNew]);

  const loadBackgroundImages = async (profileName: string) => {
    try {
      const response = await getBackgroundImages(profileName);
      setBackgroundImages(response.images);
    } catch (error) {
      console.error("Failed to load background images", error);
    }
  };

  const handleAddImage = (file: File) => {
    // 验证文件大小（例如 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(t("settingsPage.profileDialog.imageTooLarge"));
      return;
    }

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      setError(t("settingsPage.profileDialog.invalidImageFormat"));
      return;
    }

    // 添加到待上传列表
    setPendingImages((prev) => [...prev, file]);
    setError("");
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteImage = (imageId: string) => {
    // 只标记为待删除，保存时才真正删除
    setPendingDeletes((prev) => [...prev, imageId]);
  };

  // 过滤掉待删除的图片
  const visibleImages = backgroundImages.filter(
    (img) => !pendingDeletes.includes(img.id)
  );
  const landscapeImages = visibleImages.filter(
    (img) => img.orientation === "Landscape"
  );
  const portraitImages = visibleImages.filter(
    (img) => img.orientation === "Portrait"
  );

  // 为待上传图片创建稳定的预览 URL，并在变化时清理旧 URL
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);

  useEffect(() => {
    // 创建新的 URL
    const newUrls = pendingImages.map((file) => URL.createObjectURL(file));
    setPendingImageUrls(newUrls);

    // 清理函数：在下次执行或组件卸载时释放 URL
    return () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingImages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("settingsPage.profileDialog.nameRequired"));
      return;
    }

    let searchEngine = "";
    if (searchEngineType === "custom") {
      if (!customSearchEngine.trim()) {
        setError(t("settingsPage.profileDialog.customSearchUrlRequired"));
        return;
      }
      if (!customSearchEngine.includes("{}")) {
        setError(t("settingsPage.profileDialog.searchUrlPlaceholderRequired"));
        return;
      }
      searchEngine = customSearchEngine.trim();
    } else {
      const presets = getSearchEnginePresets(t);
      const preset = presets.find((p) => p.value === searchEngineType);
      searchEngine = preset?.url || "";
    }

    setLoading(true);
    setError("");
    try {
      // 1. 先保存 profile（如果名称改变，会先改名，然后再更新其他设置）
      await onSave({
        name: name.trim(),
        searchEngine,
        intranetCheckUrl: intranetCheckUrl.trim() || undefined,
        originalName: profile?.name, // 传递原始名称，用于判断是否需要改名
      });

      const profileName = name.trim();

      // 2. 如果有待上传的图片，逐个上传
      if (pendingImages.length > 0) {
        for (const imageFile of pendingImages) {
          try {
            await uploadBackgroundImage(profileName, imageFile);
          } catch (err) {
            console.error("Failed to upload background image", err);
            // 继续上传其他图片，不中断流程
          }
        }
        // 清空待上传列表
        setPendingImages([]);
      }

      // 3. 如果有待删除的图片，逐个删除
      if (pendingDeletes.length > 0) {
        for (const imageId of pendingDeletes) {
          try {
            await deleteBackgroundImage(profileName, imageId);
          } catch (err) {
            console.error("Failed to delete background image", err);
            // 继续删除其他图片，不中断流程
          }
        }
        // 清空待删除列表
        setPendingDeletes([]);
      }

      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settingsPage.profileDialog.operationFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={isMobile ? "max-w-full px-4" : "sm:max-w-[600px]"}
      >
        <Modal.Header>
          <Modal.Title>
            {isNew
              ? t("settingsPage.profileDialog.newTitle")
              : t("settingsPage.profileDialog.editTitle")}
          </Modal.Title>
          <Modal.Description>
            {isNew
              ? t("settingsPage.profileDialog.newDesc")
              : t("settingsPage.profileDialog.editDesc")}
          </Modal.Description>
        </Modal.Header>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t("common.name")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settingsPage.profileDialog.namePlaceholder")}
              disabled={loading}
            />
          </div>

          <div className="h-2"></div>

          <div className="space-y-2">
            <Label>{t("settingsPage.profileDialog.defaultSearchEngine")}</Label>
            <Select
              value={searchEngineType}
              onValueChange={setSearchEngineType}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t(
                    "settingsPage.profileDialog.selectSearchEngine"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {getSearchEnginePresets(t).map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {searchEngineType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-search">
                {t("settingsPage.profileDialog.customSearchUrl")}
              </Label>
              <Input
                id="custom-search"
                value={customSearchEngine}
                onChange={(e) => setCustomSearchEngine(e.target.value)}
                placeholder={t(
                  "settingsPage.profileDialog.customSearchUrlPlaceholder"
                )}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t("settingsPage.profileDialog.searchUrlPlaceholderHint")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="intranet-check-url">
              {t("settingsPage.profileDialog.intranetCheckUrl")}
            </Label>
            <Input
              id="intranet-check-url"
              value={intranetCheckUrl}
              onChange={(e) => setIntranetCheckUrl(e.target.value)}
              placeholder={t(
                "settingsPage.profileDialog.intranetCheckUrlPlaceholder"
              )}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.profileDialog.intranetCheckUrlHint")}
            </p>
          </div>

          {/* 背景图管理 */}
          {(isNew || profile) && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label className="text-base font-semibold">
                  {t("settingsPage.profileDialog.backgroundImages")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settingsPage.profileDialog.backgroundImagesDesc")}
                </p>
              </div>

              {/* 上传按钮 */}
              <label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAddImage(file);
                    }
                    e.target.value = ""; // 重置 input
                  }}
                  disabled={loading}
                  multiple
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  asChild
                >
                  <span>
                    <Upload className="size-4 mr-2" />
                    {t("settingsPage.profileDialog.uploadBackgroundImage")}
                  </span>
                </Button>
              </label>

              {/* 图片滚动容器 */}
              <ScrollArea className="h-64 pt-4">
                <div className="space-y-4 pr-4">
                  {/* 待上传图片预览 */}
                  {pendingImages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {t("settingsPage.profileDialog.pendingImages", {
                          count: pendingImages.length,
                        })}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {pendingImages.map((_, index) => {
                          const previewUrl = pendingImageUrls[index];
                          return (
                            <div
                              key={index}
                              className="relative group rounded-md overflow-hidden border cursor-pointer"
                              onClick={() => window.open(previewUrl, "_blank")}
                            >
                              <img
                                src={previewUrl}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-auto max-h-32 object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePendingImage(index);
                                }}
                                disabled={loading}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 横图列表 */}
                  {landscapeImages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {t("settingsPage.profileDialog.landscapeImages")}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {landscapeImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group rounded-md overflow-hidden border cursor-pointer"
                            onClick={() =>
                              window.open(
                                backgroundImageUrl(img.filename),
                                "_blank"
                              )
                            }
                          >
                            <img
                              src={backgroundImageUrl(img.filename)}
                              alt="Landscape"
                              className="w-full h-auto max-h-32 object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(img.id);
                              }}
                              disabled={loading}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 竖图列表 */}
                  {portraitImages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {t("settingsPage.profileDialog.portraitImages")}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {portraitImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group rounded-md overflow-hidden border cursor-pointer"
                            onClick={() =>
                              window.open(
                                backgroundImageUrl(img.filename),
                                "_blank"
                              )
                            }
                          >
                            <img
                              src={backgroundImageUrl(img.filename)}
                              alt="Portrait"
                              className="w-full h-auto max-h-32 object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(img.id);
                              }}
                              disabled={loading}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 无背景图提示 */}
                  {!isNew &&
                    backgroundImages.length === 0 &&
                    pendingImages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("settingsPage.profileDialog.noBackgroundImages")}
                      </p>
                    )}
                  {isNew && pendingImages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("settingsPage.profileDialog.noBackgroundImages")}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {error && <p className="text-sm text-destructive pt-2">{error}</p>}

          <Modal.Footer className="gap-2 flex-row pt-4">
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
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}

// 删除确认对话框
function DeleteConfirmDialog({
  open,
  onOpenChange,
  profileName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { Modal, isMobile } = useResponsiveModal();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error(t("settingsPage.deleteFailed"), err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={isMobile ? "max-w-full px-4" : "sm:max-w-[400px]"}
      >
        <Modal.Header>
          <Modal.Title>
            {t("settingsPage.deleteConfirmDialog.title")}
          </Modal.Title>
          <Modal.Description>
            {t("settingsPage.deleteConfirmDialog.message", {
              name: profileName,
            })}
          </Modal.Description>
        </Modal.Header>

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
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className={isMobile ? "flex-1" : ""}
          >
            {loading ? t("common.deleting") : t("common.delete")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const clearAll = useClearAll();
  const currentProfile = useCurrentProfile();
  const setCurrentProfile = useSetCurrentProfile();

  // Profile 管理状态
  const [profileNames, setProfileNames] = useState<string[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<BookmarkProfile | null>(
    null
  );
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string>("");

  // 拖拽排序
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 加载所有 Profile 名称
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const names = await getAllProfileNames();
      setProfileNames(names);
    } catch (error) {
      console.error(t("settingsPage.loadProfileListFailed"), error);
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      clearAll();
      navigate("/login");
    } catch (error) {
      console.error(t("settingsPage.logoutFailed"), error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = profileNames.indexOf(active.id as string);
      const newIndex = profileNames.indexOf(over.id as string);
      const newOrder = arrayMove(profileNames, oldIndex, newIndex);

      // 乐观更新
      setProfileNames(newOrder);

      try {
        await sortProfiles(newOrder);
      } catch (error) {
        console.error(t("settingsPage.sortFailed"), error);
        loadProfiles();
      }
    }
  };

  const handleNewProfile = () => {
    setEditingProfile(null);
    setIsNewProfile(true);
    setProfileDialogOpen(true);
  };

  const handleEditProfile = async (name: string) => {
    try {
      const profile = await getProfile(name);
      setEditingProfile(profile);
      setIsNewProfile(false);
      setProfileDialogOpen(true);
    } catch (error) {
      console.error(t("settingsPage.loadProfileFailed"), error);
    }
  };

  const handleDeleteProfile = (name: string) => {
    setProfileToDelete(name);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteProfile(profileToDelete);
      // 如果删除的是当前 Profile，切换到第一个
      if (currentProfile === profileToDelete) {
        const remaining = profileNames.filter((n) => n !== profileToDelete);
        if (remaining.length > 0) {
          setCurrentProfile(remaining[0]);
        }
      }
      loadProfiles();
    } catch (error) {
      console.error(t("settingsPage.deleteFailed"), error);
      throw error;
    }
  };

  const handleSaveProfile = async (params: ProfileSaveParams) => {
    if (isNewProfile) {
      // 创建新 Profile
      const newProfile: BookmarkProfile = {
        name: params.name,
        bookmarks: [],
        tags: [],
        search_engine: params.searchEngine,
        intranet_check_url: params.intranetCheckUrl,
      };
      await createProfile(newProfile);
      loadProfiles();
    } else if (editingProfile) {
      const nameChanged =
        params.originalName && params.name !== params.originalName;

      // 如果名称改变了，先改名
      if (nameChanged) {
        await renameProfile(params.originalName!, params.name);
        // 如果改名的是当前 Profile，更新当前 Profile 名称
        if (currentProfile === params.originalName) {
          setCurrentProfile(params.name);
        }
        // 改名后需要重新加载 profile 列表
        loadProfiles();
      }

      // 更新 Profile 的其他设置（使用新名称）
      const updatedProfile: BookmarkProfile = {
        ...editingProfile,
        name: params.name, // 使用新名称
        search_engine: params.searchEngine,
        intranet_check_url: params.intranetCheckUrl,
      };
      await updateProfile(updatedProfile);
    }
  };

  const handleSelectProfile = (name: string) => {
    setCurrentProfile(name);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 顶部栏 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">{t("settingsPage.title")}</h1>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">
                    {t("settingsPage.profileManagement")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settingsPage.profileManagementDesc")}
                  </p>
                </div>
                <Button size="sm" onClick={handleNewProfile}>
                  <Plus className="size-4 mr-1" />
                  {t("settingsPage.new")}
                </Button>
              </div>

              {profilesLoading ? (
                <div className="text-sm text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : profileNames.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t("settingsPage.noProfile")}
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={profileNames}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {profileNames.map((name) => (
                        <SortableProfileItem
                          key={name}
                          name={name}
                          isActive={name === currentProfile}
                          onEdit={() => handleEditProfile(name)}
                          onDelete={() => handleDeleteProfile(name)}
                          onSelect={() => handleSelectProfile(name)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">
                    {t("settingsPage.appearance")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settingsPage.appearanceDesc")}
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">
                    {t("settingsPage.language")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settingsPage.languageDesc")}
                  </p>
                </div>
                <LanguageToggle />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  {t("settingsPage.account")}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("settingsPage.accountDesc")}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {logoutLoading
                  ? t("settingsPage.loggingOut")
                  : t("settingsPage.logout")}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  {t("settingsPage.about")}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  A Navigation v{packageJson.version}
                </p>
                {/* Author */}
                <p className="text-sm text-muted-foreground mt-1">
                  Developed by{" "}
                  <a
                    href="https://github.com/yorufx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    yorufx
                  </a>
                </p>
                {/* Repository */}
                <p className="text-sm text-muted-foreground mt-1">
                  <a
                    href="https://github.com/yorufx/anav"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    GitHub Repository
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  © 2025 yorufx. Licensed under the{" "}
                  <a
                    href="https://github.com/yorufx/anav/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    Apache License 2.0
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Profile 编辑对话框 */}
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        profile={editingProfile}
        onSave={handleSaveProfile}
        isNew={isNewProfile}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        profileName={profileToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
