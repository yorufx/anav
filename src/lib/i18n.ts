import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "@/locales/zh.json";
import en from "@/locales/en.json";

// 从 localStorage 获取初始语言
const getInitialLanguage = () => {
  try {
    const stored = localStorage.getItem("anav-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.language) {
        return parsed.state.language;
      }
    }
  } catch {
    // 忽略解析错误
  }
  return "zh";
};

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
