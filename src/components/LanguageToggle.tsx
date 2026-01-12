import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, useSetLanguage } from "@/lib/store";
import type { Language } from "@/lib/store";
import i18n from "@/lib/i18n";

export function LanguageToggle() {
  const { t } = useTranslation();
  const language = useLanguage();
  const setLanguage = useSetLanguage();

  const getLanguageText = () => {
    if (language === "zh") {
      return t("languageToggle.zh");
    }
    return t("languageToggle.en");
  };

  const handleLanguageChange = (value: string) => {
    const newLanguage = value as Language;
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="default"
          className="gap-2"
          aria-label={t("languageToggle.toggleLanguage")}
        >
          <Languages className="size-5" />
          <span className="hidden sm:inline">{getLanguageText()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={handleLanguageChange}
        >
          <DropdownMenuRadioItem value="zh">
            {t("languageToggle.zh")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">
            {t("languageToggle.en")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
