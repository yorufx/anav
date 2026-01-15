import type { BackgroundImage, BookmarkProfile, ImageOrientation } from "@/types/bookmark";
import { apiClient } from "./axios";
import { useAppStore } from "./store";

export async function login(username: string, password: string): Promise<void> {
  await apiClient.post("/api/login", {
    username,
    password,
  });
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/logout");
}

export async function getProfile(profile?: string): Promise<BookmarkProfile> {
  const currentProfile = useAppStore.getState().currentProfile;
  const profileToUse = profile ?? currentProfile ?? undefined;
  const params = profileToUse ? { profile: profileToUse } : {};
  const response = await apiClient.get("/api/profile", { params });
  const profileData: BookmarkProfile = response.data;

  // Only update the stored version if fetching the current profile
  // This prevents overwriting the version when previewing other profiles
  const isCurrentProfile = !profile || profile === currentProfile || (!currentProfile && !profile);
  if (isCurrentProfile && profileData.version) {
    useAppStore.getState().setProfileVersion(profileData.version);
  }

  return profileData;
}

export async function createProfile(profile: BookmarkProfile): Promise<void> {
  await apiClient.post("/api/profile", profile);
}

export async function updateProfile(profile: BookmarkProfile): Promise<void> {
  // Include the current version for optimistic concurrency control
  const currentVersion = useAppStore.getState().profileVersion;
  const profileWithVersion: BookmarkProfile = {
    ...profile,
    version: currentVersion ?? undefined,
  };

  await apiClient.put("/api/profile", profileWithVersion);

  // After successful update, fetch the new version
  // The server will return 409 Conflict if version mismatch
  const updatedProfile = await getProfile(profile.name);
  if (updatedProfile.version) {
    useAppStore.getState().setProfileVersion(updatedProfile.version);
  }
}

export async function deleteProfile(profile: string): Promise<void> {
  await apiClient.delete("/api/profile", {
    params: { profile },
  });
}

interface VersionResponse {
  version?: string;
}

export async function renameProfile(
  name: string,
  newName: string
): Promise<void> {
  const response = await apiClient.post<VersionResponse>("/api/profile/rename", {
    name,
    new_name: newName,
  });

  // Update the stored version if renaming the current profile
  const currentProfile = useAppStore.getState().currentProfile;
  if (name === currentProfile && response.data.version) {
    useAppStore.getState().setProfileVersion(response.data.version);
  }
}

export async function getAllProfileNames(): Promise<string[]> {
  const response = await apiClient.get("/api/profile/names");
  return response.data;
}

export async function sortProfiles(profileNames: string[]): Promise<void> {
  await apiClient.post("/api/profile/sort", profileNames);
}

export async function setIcon(
  bookmarkId: string,
  iconFile: File
): Promise<void> {
  const formData = new FormData();
  formData.append("icon", iconFile);
  await apiClient.post(`/api/images/icon/${bookmarkId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export function iconUrl(iconFilename: string): string {
  return `${apiClient.defaults.baseURL}/images/icons/${iconFilename}`;
}

export interface FaviconIcon {
  url: string;
  data: string; // base64 encoded
  content_type: string;
}

export interface FaviconResult {
  icons: FaviconIcon[];
}

export async function fetchFavicon(url: string): Promise<FaviconResult> {
  const response = await apiClient.get("/api/fetch-favicon", {
    params: { url },
  });
  return response.data;
}

export interface BackgroundImageInfo {
  id: string;
  filename: string;
  orientation: ImageOrientation;
  url: string;
}

export interface BackgroundImageListResponse {
  images: BackgroundImageInfo[];
}

interface UploadBackgroundImageResponse {
  image: BackgroundImage;
  version?: string;
}

/**
 * 上传背景图
 * @param profile Profile 名称
 * @param imageFile 图片文件
 */
export async function uploadBackgroundImage(
  profile: string,
  imageFile: File
): Promise<BackgroundImage> {
  const formData = new FormData();
  formData.append("image", imageFile);
  const response = await apiClient.post<UploadBackgroundImageResponse>(
    "/api/background-image",
    formData,
    {
      params: {
        profile,
      },
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  // Update the stored version if uploading to the current profile
  const currentProfile = useAppStore.getState().currentProfile;
  if (profile === currentProfile && response.data.version) {
    useAppStore.getState().setProfileVersion(response.data.version);
  }

  return response.data.image;
}

/**
 * 获取背景图列表
 * @param profile Profile 名称
 */
export async function getBackgroundImages(
  profile: string
): Promise<BackgroundImageListResponse> {
  const response = await apiClient.get<BackgroundImageListResponse>(
    "/api/background-image",
    {
      params: { profile },
    }
  );
  return response.data;
}

/**
 * 删除背景图
 * @param profile Profile 名称
 * @param imageId 背景图 ID
 */
export async function deleteBackgroundImage(
  profile: string,
  imageId: string
): Promise<void> {
  const response = await apiClient.delete<VersionResponse>("/api/background-image/delete", {
    params: {
      profile,
      id: imageId,
    },
  });

  // Update the stored version if deleting from the current profile
  const currentProfile = useAppStore.getState().currentProfile;
  if (profile === currentProfile && response.data.version) {
    useAppStore.getState().setProfileVersion(response.data.version);
  }
}

/**
 * 获取背景图 URL
 * @param filename 背景图文件名
 */
export function backgroundImageUrl(filename: string): string {
  return `${apiClient.defaults.baseURL}/images/backgrounds/${filename}`;
}
