/**
 * Toast hook wrapper around sonner
 * Provides a consistent API for showing toast notifications
 */
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
}

export function useToast() {
  const toast = {
    success: (title: string, options?: ToastOptions) => {
      sonnerToast.success(title, {
        description: options?.description,
        duration: options?.duration ?? 3000,
      });
    },
    error: (title: string, options?: ToastOptions) => {
      sonnerToast.error(title, {
        description: options?.description,
        duration: options?.duration ?? 5000,
      });
    },
    info: (title: string, options?: ToastOptions) => {
      sonnerToast.info(title, {
        description: options?.description,
        duration: options?.duration ?? 4000,
      });
    },
    warning: (title: string, options?: ToastOptions) => {
      sonnerToast.warning(title, {
        description: options?.description,
        duration: options?.duration ?? 4000,
      });
    },
  };

  return { toast };
}
