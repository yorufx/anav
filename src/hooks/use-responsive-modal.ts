import { useMemo } from "react";
import { useMediaQuery } from "./use-media-query";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function useResponsiveModal(desktopBreakpoint = "(min-width: 768px)") {
  const isDesktop = useMediaQuery(desktopBreakpoint);
  const isMobile = !isDesktop;

  const Modal = useMemo(
    () => ({
      Root: isDesktop ? Dialog : Drawer,
      Trigger: isDesktop ? DialogTrigger : DrawerTrigger,
      Content: isDesktop ? DialogContent : DrawerContent,
      Header: isDesktop ? DialogHeader : DrawerHeader,
      Title: isDesktop ? DialogTitle : DrawerTitle,
      Description: isDesktop ? DialogDescription : DrawerDescription,
      Footer: isDesktop ? DialogFooter : DrawerFooter,
      Close: isDesktop ? DialogClose : DrawerClose,
    }),
    [isDesktop]
  );

  return {
    Modal,
    isMobile,
    isDesktop,
  };
}
