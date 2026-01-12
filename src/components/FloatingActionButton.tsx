import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Plus, User, Building2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getAllProfileNames } from "@/lib/api";
import { useCurrentProfile, useSetCurrentProfile } from "@/lib/store";

interface FloatingActionButtonProps {
  onAddBookmark?: () => void;
  onSettings?: () => void;
  onProfileSwitch?: () => void;
  /** 是否配置了内网检测 */
  hasIntranetCheck?: boolean;
  /** 当前是否处于内网环境 */
  isIntranet?: boolean;
  className?: string;
}

export function FloatingActionButton({
  onAddBookmark,
  onSettings,
  onProfileSwitch,
  hasIntranetCheck = false,
  isIntranet = false,
  className,
}: FloatingActionButtonProps) {
  const { t } = useTranslation();
  const [profileNames, setProfileNames] = useState<string[]>([]);
  const currentProfile = useCurrentProfile();
  const setCurrentProfile = useSetCurrentProfile();

  useEffect(() => {
    const loadProfileNames = async () => {
      try {
        const names = await getAllProfileNames();
        setProfileNames(names);
      } catch (error) {
        console.error(t("settingsPage.loadProfileListFailed"), error);
      }
    };
    loadProfileNames();
  }, [currentProfile]); // 当 currentProfile 变化时重新加载列表

  const handleProfileSwitch = async (profileName: string) => {
    if (profileName === currentProfile) return;
    setCurrentProfile(profileName);
    onProfileSwitch?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "fixed bottom-6 right-6",
            "size-14 rounded-full",
            "shadow-lg hover:shadow-xl",
            "transition-all hover:scale-110",
            "z-50",
            hasIntranetCheck
              ? isIntranet
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-secondary text-secondary-foreground"
              : "bg-secondary text-secondary-foreground",
            className
          )}
          aria-label={
            hasIntranetCheck
              ? isIntranet
                ? t("floatingActionButton.intranet")
                : t("floatingActionButton.extranet")
              : t("floatingActionButton.settings")
          }
        >
          {hasIntranetCheck ? (
            isIntranet ? (
              <Building2 className="size-6" />
            ) : (
              <Globe className="size-6" />
            )
          ) : (
            <Settings className="size-6" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-48 mb-2"
      >
        <DropdownMenuItem onClick={onAddBookmark}>
          <Plus className="size-4 mr-2" />
          {t("floatingActionButton.addBookmark")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <User className="size-4 mr-2" />
            {currentProfile || t("common.notSelected")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {profileNames.map((name) => (
              <DropdownMenuItem
                key={name}
                onClick={() => handleProfileSwitch(name)}
                className={cn(name === currentProfile && "bg-accent")}
              >
                {name}
                {name === currentProfile && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onSettings}>
          <Settings className="size-4 mr-2" />
          {t("floatingActionButton.detailedSettings")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
