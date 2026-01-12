import {
  useTheme as useZustandTheme,
  useSetTheme,
  type Theme,
} from "@/lib/store";

export const useTheme = () => {
  const theme = useZustandTheme();
  const setTheme = useSetTheme();

  return {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
  };
};
