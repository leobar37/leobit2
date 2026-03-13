import { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";

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
    const isDestructive = state.variant === "destructive";

    return (
      <Drawer open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DrawerContent className="px-4 pb-6 pt-2">
          <DrawerHeader className="space-y-4 pb-2">
            {/* Icon indicator for destructive actions */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100">
              <AlertTriangle className={cn(
                "h-6 w-6",
                isDestructive ? "text-red-600" : "text-orange-500"
              )} />
            </div>

            <div className="space-y-2 text-center">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {state.title}
              </DrawerTitle>
              {state.description && (
                <DrawerDescription className="text-sm leading-relaxed text-muted-foreground">
                  {state.description}
                </DrawerDescription>
              )}
            </div>
          </DrawerHeader>

          <DrawerFooter className="mt-4 gap-3 sm:flex-col">
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={handleConfirm}
              className={cn(
                "h-12 w-full rounded-xl text-base font-semibold",
                !isDestructive && "bg-orange-500 hover:bg-orange-600"
              )}
            >
              {state.confirmText}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-12 w-full rounded-xl text-base font-medium"
            >
              {state.cancelText}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }, [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
