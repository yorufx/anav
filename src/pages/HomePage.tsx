import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Bookmark, BookmarkProfile } from "@/types/bookmark";
import { SearchBox } from "@/components/SearchBox";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SortableBookmarkCard } from "@/components/SortableBookmarkCard";
import { SortableTagButton } from "@/components/SortableTagButton";
import { NewBookmarkDialog } from "@/components/NewBookmarkDialog";
import { DeleteBookmarkDialog } from "@/components/DeleteBookmarkDialog";
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
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { getProfile, updateProfile, backgroundImageUrl } from "@/lib/api";
import { fuzzySearch } from "@/lib/search";
import { updateProfileTags } from "@/lib/bookmark-utils";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/use-media-query";

export function HomePage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(t("common.all"));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<string[]>([t("common.all")]);
  const [profile, setProfile] = useState<BookmarkProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<Bookmark | null>(
    null
  );
  const [selectedSearchBookmark, setSelectedSearchBookmark] =
    useState<Bookmark | null>(null);
  const [isIntranet, setIsIntranet] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const navigate = useNavigate();

  // 检测设备方向（横屏/竖屏）
  const isLandscape = useMediaQuery("(orientation: landscape)");

  // Drag sensors - add activation constraint to avoid accidental clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Move 8px before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = async () => {
    try {
      const profileData = await getProfile();
      setProfile(profileData);
      setBookmarks(profileData.bookmarks);
      setTags([t("common.all"), ...profileData.tags]);

      // 检测内网环境
      if (profileData.intranet_check_url) {
        checkIntranet(profileData.intranet_check_url);
      } else {
        setIsIntranet(false);
      }

      // 选择背景图（根据设备方向随机选择）
      selectBackgroundImage(profileData);
    } catch (error) {
      console.error(t("homePage.loadBookmarksFailed"), error);
    } finally {
      setLoading(false);
    }
  };

  // 选择背景图（根据设备方向随机选择）
  const selectBackgroundImage = (profileData: BookmarkProfile) => {
    const images = profileData.background_images || [];
    if (images.length === 0) {
      setBackgroundImage(null);
      return;
    }

    // 根据设备方向筛选图片
    const orientation = isLandscape ? "Landscape" : "Portrait";
    const matchingImages = images.filter(
      (img) => img.orientation === orientation
    );

    // 如果没有匹配的图片，从所有图片中随机选择
    const pool = matchingImages.length > 0 ? matchingImages : images;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedImage = pool[randomIndex];

    setBackgroundImage(backgroundImageUrl(selectedImage.filename));
  };

  // 检测是否在内网环境
  const checkIntranet = async (checkUrl: string) => {
    try {
      // 使用 no-cors 模式避免 CORS 问题，只要请求成功就认为在内网
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

      await fetch(checkUrl, {
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsIntranet(true);
    } catch {
      // 请求失败或超时，认为不在内网
      setIsIntranet(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter bookmarks by search query
  // Do not filter bookmarks if a search bookmark is selected
  const searchFiltered = selectedSearchBookmark
    ? bookmarks
    : fuzzySearch(bookmarks, searchQuery);

  // Filter bookmarks by tag
  const filteredBookmarks = searchFiltered.filter((bookmark) => {
    const matchesTag =
      selectedTag === t("common.all") || bookmark.tags.includes(selectedTag);
    return matchesTag;
  });

  // Handle bookmark drag end
  const handleBookmarkDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && profile) {
      // Find the index of the bookmark in the original bookmarks array
      const oldBookmarkIndex = bookmarks.findIndex(
        (item) => item.id === active.id
      );
      const targetBookmarkIndex = bookmarks.findIndex(
        (item) => item.id === over.id
      );

      if (oldBookmarkIndex === -1 || targetBookmarkIndex === -1) return;

      // Save the original state in case of error
      const originalBookmarks = [...bookmarks];
      const originalProfile = profile;

      // Rearrange the bookmarks array
      const newBookmarks = [...bookmarks];
      const [removed] = newBookmarks.splice(oldBookmarkIndex, 1);
      newBookmarks.splice(targetBookmarkIndex, 0, removed);

      // Update the local state
      setBookmarks(newBookmarks);

      // Update the profile and sync to the backend
      const updatedProfile: BookmarkProfile = {
        ...profile,
        bookmarks: newBookmarks,
      };

      setProfile(updatedProfile);

      // Asynchronously update the backend, without blocking the UI
      try {
        await updateProfile(updatedProfile);
      } catch (error) {
        console.error(t("homePage.updateBookmarkSortFailed"), error);
        setBookmarks(originalBookmarks);
        setProfile(originalProfile);
      }
    }
  };

  // Handle tag drag end
  const handleTagDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && profile) {
      const allTag = t("common.all");
      if (active.id === allTag || over.id === allTag) return;

      const actualTags = tags.filter((tag) => tag !== allTag);
      const oldTagIndex = actualTags.findIndex((tag) => tag === active.id);
      const targetTagIndex = actualTags.findIndex((tag) => tag === over.id);

      if (oldTagIndex === -1 || targetTagIndex === -1) return;

      // Save the original state in case of error
      const originalTags = [...tags];
      const originalProfile = profile;

      // Rearrange the tags array (exclude "全部")
      const newTags = [...actualTags];
      const [removed] = newTags.splice(oldTagIndex, 1);
      newTags.splice(targetTagIndex, 0, removed);

      const newTagsWithAll = [t("common.all"), ...newTags];
      setTags(newTagsWithAll);

      // Update the profile and sync to the backend
      const updatedProfile: BookmarkProfile = {
        ...profile,
        tags: newTags,
      };

      setProfile(updatedProfile);

      // Asynchronously update the backend, without blocking the UI
      try {
        await updateProfile(updatedProfile);
      } catch (error) {
        console.error("Update tag sorting failed:", error);
        // If the update fails, restore the original order
        setTags(originalTags);
        setProfile(originalProfile);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Enter key to search
    if (searchQuery.trim()) {
      let searchEngineTemplate: string;
      if (selectedSearchBookmark?.search_url) {
        // Use the selected bookmark's search engine
        searchEngineTemplate = selectedSearchBookmark.search_url;
      } else if (profile) {
        // Use the default search engine
        searchEngineTemplate = profile.search_engine;
      } else {
        return;
      }

      const searchUrl = searchEngineTemplate.replace(
        "{}",
        encodeURIComponent(searchQuery)
      );
      window.location.href = searchUrl;
    }
  };

  // Handle edit bookmark
  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setDialogOpen(true);
  };

  // Handle delete bookmark
  const handleDeleteBookmark = (bookmark: Bookmark) => {
    setDeletingBookmark(bookmark);
  };

  // Confirm delete bookmark
  const handleConfirmDelete = async () => {
    if (!profile || !deletingBookmark) return;

    try {
      // Remove the bookmark from the bookmarks list
      const updatedBookmarks = bookmarks.filter(
        (b) => b.id !== deletingBookmark.id
      );

      // Update profile and recalculate tags
      const updatedProfile = updateProfileTags({
        ...profile,
        bookmarks: updatedBookmarks,
      });

      setBookmarks(updatedBookmarks);
      setProfile(updatedProfile);
      setTags([t("common.all"), ...updatedProfile.tags]);

      // Asynchronously update the backend
      await updateProfile(updatedProfile);
    } catch (error) {
      console.error(t("homePage.deleteBookmarkFailed"), error);
      loadData();
    } finally {
      setDeletingBookmark(null);
    }
  };

  // 是否有背景图
  const hasBackground = !!backgroundImage;

  return (
    <div
      className="min-h-screen bg-background bg-cover bg-center bg-no-repeat bg-fixed"
      style={
        backgroundImage
          ? { backgroundImage: `url(${backgroundImage})` }
          : undefined
      }
    >
      <div className="container mx-auto px-4 py-8">
        {/* Search box */}
        <SearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={handleSearch}
          searchResults={
            selectedSearchBookmark
              ? [] // Do not show search results if a search bookmark is selected
              : searchFiltered.slice(0, 10) // Limit to 10 results
          }
          onSelectedBookmarkChange={setSelectedSearchBookmark}
          hasBackground={hasBackground}
          useIntranetUrl={isIntranet}
          className="max-w-2xl mx-auto mb-12"
        />

        {/* Tag filter */}
        {!loading && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTagDragEnd}
          >
            <SortableContext items={tags} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {tags.map((tag) => (
                  <SortableTagButton
                    key={tag}
                    tag={tag}
                    selected={selectedTag === tag}
                    onClick={() => setSelectedTag(tag)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Loading state */}
        {loading ? (
          // Empty now to prevent flickering
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {/* Skeleton */}
            {/* {Array.from({ length: 12 }).map((_, index) => (
              <BookmarkCardSkeleton key={index} />
            ))} */}
          </div>
        ) : (
          <>
            {/* Bookmark grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBookmarkDragEnd}
            >
              <SortableContext
                items={filteredBookmarks.map((b) => b.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {filteredBookmarks.map((bookmark) => (
                    <SortableBookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      searchQuery={selectedSearchBookmark ? "" : searchQuery} // Do not highlight the title if a search bookmark is selected
                      useIntranetUrl={isIntranet}
                      hasBackground={hasBackground}
                      onEdit={handleEditBookmark}
                      onDelete={handleDeleteBookmark}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Empty state */}
            {filteredBookmarks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t("homePage.noBookmarksFound")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      {/* Floating action button */}
      <FloatingActionButton
        onAddBookmark={() => {
          setEditingBookmark(null);
          setDialogOpen(true);
        }}
        onSettings={() => navigate("/settings")}
        onProfileSwitch={() => {
          setLoading(true);
          loadData();
        }}
        hasIntranetCheck={!!profile?.intranet_check_url}
        isIntranet={isIntranet}
      />
      {/* New/Edit bookmark dialog */}
      {profile && (
        <NewBookmarkDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingBookmark(null);
            }
          }}
          trigger={<></>}
          profile={profile}
          bookmark={editingBookmark || undefined}
          onSuccess={() => {
            loadData();
            setEditingBookmark(null);
          }}
        />
      )}
      {/* Delete bookmark dialog */}
      <DeleteBookmarkDialog
        open={!!deletingBookmark}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingBookmark(null);
          }
        }}
        bookmark={deletingBookmark}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
