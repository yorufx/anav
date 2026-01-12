import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import type { Theme } from "@/lib/store";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const getIcon = () => {
    if (theme === "light") {
      return <Sun className="size-5" />;
    } else if (theme === "dark") {
      return <Moon className="size-5" />;
    }
    return <Monitor className="size-5" />;
  };

  const getThemeText = () => {
    if (theme === "light") {
      return t("themeToggle.light");
    } else if (theme === "dark") {
      return t("themeToggle.dark");
    }
    return t("themeToggle.system");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="default"
          className="gap-2"
          aria-label={t("themeToggle.toggleTheme")}
        >
          {getIcon()}
          <span className="hidden sm:inline">{getThemeText()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4 mr-2" />
            {t("themeToggle.light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4 mr-2" />
            {t("themeToggle.dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4 mr-2" />
            {t("themeToggle.system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
