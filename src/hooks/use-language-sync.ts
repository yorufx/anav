import { useEffect } from "react";
import { useLanguage } from "@/lib/store";
import i18n from "@/lib/i18n";

/**
 * Hook to sync language from store to i18n
 */
export function useLanguageSync() {
  const language = useLanguage();

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);
}
