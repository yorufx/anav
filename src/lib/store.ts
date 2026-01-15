import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 主题类型定义
 */
export type Theme = "dark" | "light" | "system";

/**
 * 语言类型定义
 */
export type Language = "zh" | "en";

/**
 * 应用状态接口
 */
interface AppState {
  // 当前选中的 profile 名称
  currentProfile: string | null;

  // 当前 profile 的版本（用于乐观锁）
  profileVersion: string | null;

  // 主题设置
  theme: Theme;

  // 语言设置
  language: Language;

  // Actions
  setCurrentProfile: (profile: string | null) => void;
  setProfileVersion: (version: string | null) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  clearAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      currentProfile: null,
      profileVersion: null,
      theme: "system",
      language: "zh",

      // Set current profile
      setCurrentProfile: (profile) => set({ currentProfile: profile }),

      // Set profile version
      setProfileVersion: (version) => set({ profileVersion: version }),

      // Set theme
      setTheme: (theme) => set({ theme }),

      // Set language
      setLanguage: (language) => set({ language }),

      // Clear all data
      clearAll: () => set({ currentProfile: null, profileVersion: null, theme: "system", language: "zh" }),
    }),
    {
      name: "anav-storage",
      // partialize: (state) => ({ currentProfile: state.currentProfile }),
    }
  )
);

/**
 * 便捷的 selector hooks
 */
export const useCurrentProfile = () =>
  useAppStore((state) => state.currentProfile);
export const useSetCurrentProfile = () =>
  useAppStore((state) => state.setCurrentProfile);
export const useProfileVersion = () =>
  useAppStore((state) => state.profileVersion);
export const useSetProfileVersion = () =>
  useAppStore((state) => state.setProfileVersion);
export const useTheme = () => useAppStore((state) => state.theme);
export const useSetTheme = () => useAppStore((state) => state.setTheme);
export const useLanguage = () => useAppStore((state) => state.language);
export const useSetLanguage = () => useAppStore((state) => state.setLanguage);
export const useClearAll = () => useAppStore((state) => state.clearAll);
