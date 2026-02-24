"use client";

import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { Drawer, DrawerContent } from "~/components/ui/drawer";
import { Sheet, SheetContent } from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";

interface ModalConfig {
  type?: "dialog" | "sheet" | "drawer" | "responsive";
  side?: "top" | "right" | "bottom" | "left";
}

interface ModalState<T> {
  isOpen: boolean;
  data?: T;
}

interface ModalProps<T> {
  isOpen?: boolean;
  data?: T;
  onClose?: () => void;
}

function createModalAtom<T>() {
  return atom<ModalState<T>>({ isOpen: false, data: undefined });
}

export function createModal<TProps extends object>(
  ContentComponent: React.ComponentType<TProps & { close: () => void }>,
  config: ModalConfig = {}
) {
  const modalAtom = createModalAtom<TProps>();

  function useModalHook() {
    const [state, setState] = useAtom(modalAtom);

    return {
      isOpen: state.isOpen,
      data: state.data,
      open: (data?: TProps) =>
        setState({ isOpen: true, data: data || ({} as TProps) }),
      close: () => setState({ isOpen: false, data: undefined }),
      toggle: (data?: TProps) =>
        setState((prev) => ({
          isOpen: !prev.isOpen,
          data: data ?? prev.data,
        })),
    };
  }

  function ModalComponent({ isOpen: controlledIsOpen, data: controlledData, onClose }: ModalProps<TProps>) {
    const [state, setState] = useAtom(modalAtom);
    const isMobile = useIsMobile();

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : state.isOpen;
    const data = isControlled ? controlledData : state.data;

    const close = useCallback(() => {
      if (isControlled && onClose) {
        onClose();
      } else if (!isControlled) {
        setState({ isOpen: false, data: undefined });
      }
    }, [setState, isControlled, onClose]);

    if (!isOpen) return null;

    const content = (
      <ContentComponent {...((data || {}) as TProps)} close={close} />
    );

    if (config.type === "responsive") {
      if (isMobile) {
        return (
          <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
            <DrawerContent className="flex flex-col max-h-[85vh]">
              {content}
            </DrawerContent>
          </Drawer>
        );
      }
      return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
          <SheetContent
            side={config.side || "right"}
            className="flex flex-col w-full sm:max-w-md"
          >
            {content}
          </SheetContent>
        </Sheet>
      );
    }

    if (config.type === "drawer") {
      return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
          <DrawerContent className="flex flex-col max-h-[85vh]">
            {content}
          </DrawerContent>
        </Drawer>
      );
    }

    if (config.type === "sheet") {
      return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
          <SheetContent
            side={config.side || "right"}
            className="flex flex-col w-full sm:max-w-md"
          >
            {content}
          </SheetContent>
        </Sheet>
      );
    }
    // Default to drawer for mobile-first approach
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
        <DrawerContent className="flex flex-col max-h-[85vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return [ModalComponent, useModalHook] as const;
}