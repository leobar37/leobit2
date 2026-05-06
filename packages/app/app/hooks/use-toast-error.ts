import { toast } from "sonner";
import { getErrorMessage } from "~/lib/api-utils";

interface ToastErrorOptions {
  description?: string;
  duration?: number;
}

export function useToastError() {
  const showError = (message: string, error?: unknown, options?: ToastErrorOptions) => {
    console.error(message, error);
    
    const description = options?.description ?? (error ? getErrorMessage(error) : undefined);
    
    toast.error(message, {
      description,
      duration: options?.duration ?? 5000,
    });
  };

  const showSuccess = (message: string, options?: Omit<ToastErrorOptions, 'description'> & { description?: string }) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
    });
  };

  const showInfo = (message: string, options?: Omit<ToastErrorOptions, 'description'> & { description?: string }) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  };

  const showWarning = (message: string, options?: Omit<ToastErrorOptions, 'description'> & { description?: string }) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  };

  return {
    showError,
    showSuccess,
    showInfo,
    showWarning,
  };
}
