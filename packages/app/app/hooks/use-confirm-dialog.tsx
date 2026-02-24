import { useState, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    variant: "default",
    resolve: null,
  });

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          ...options,
          confirmText: options.confirmText ?? "Confirmar",
          cancelText: options.cancelText ?? "Cancelar",
          variant: options.variant ?? "default",
          isOpen: true,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const ConfirmDialog = useCallback(() => {
    return (
      <Drawer open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{state.title}</DrawerTitle>
            {state.description && (
              <DrawerDescription>{state.description}</DrawerDescription>
            )}
          </DrawerHeader>
          <DrawerFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              {state.cancelText}
            </Button>
            <Button
              variant={state.variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirm}
              className={
                state.variant !== "destructive"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : undefined
              }
            >
              {state.confirmText}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }, [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
