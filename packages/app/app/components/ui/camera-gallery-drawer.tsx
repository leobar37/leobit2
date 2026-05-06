"use client"

import { useRef, useState, useCallback } from "react";
import { Camera, ImageIcon, AlertCircle } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";

export interface CameraGalleryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  title?: string;
}

const DEFAULT_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export function CameraGalleryDrawer({
  open,
  onOpenChange,
  onFileSelect,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  title = "Adjuntar imagen",
}: CameraGalleryDrawerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const allowedTypes = accept.split(",").map((t) => t.trim());
      if (!allowedTypes.includes(file.type)) {
        return "Tipo de archivo no permitido. Usa JPG, PNG o WebP.";
      }
      if (file.size > maxSize) {
        return `Archivo muy grande. Máximo: ${maxSize / (1024 * 1024)}MB`;
      }
      return null;
    },
    [accept, maxSize]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }

    setError(null);
    onFileSelect(selectedFile);
    onOpenChange(false);
    e.target.value = "";
  };

  const handleCameraClick = () => {
    setError(null);
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    setError(null);
    galleryInputRef.current?.click();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-lg font-semibold text-foreground">
            {title}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 pt-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept={accept}
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 h-24 rounded-xl border-0 bg-muted/70 shadow-sm flex flex-col items-center justify-center gap-2",
                "hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={handleCameraClick}
            >
              <Camera className="h-7 w-7 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Tomar foto
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 h-24 rounded-xl border-0 bg-muted/70 shadow-sm flex flex-col items-center justify-center gap-2",
                "hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={handleGalleryClick}
            >
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Galería
              </span>
            </Button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
