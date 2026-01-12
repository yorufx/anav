import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useAppStore((state) => state.theme);

  // 应用主题到 DOM
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // 监听系统主题变化（当 theme 为 "system" 时）
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    // 立即应用一次
    handleChange();

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return <>{children}</>;
}
