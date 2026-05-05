import { useCallback, useState, useRef } from "react";

interface UseAssetUploaderResult {
  /** Whether the uploader panel is visible */
  isOpen: boolean;
  /** Toggle uploader visibility */
  toggle: () => void;
  /** Open the uploader panel */
  open: () => void;
  /** Close the uploader panel and clear selection */
  close: () => void;
  /** Currently selected file */
  selectedFile: File | null;
  /** URL for previewing the selected file */
  previewUrl: string | null;
  /** Handle file selection from input */
  handleFileSelect: (file: File) => void;
  /** Clear the current selection */
  clearSelection: () => void;
}

/**
 * Manages the local UI state for the asset file uploader.
 * Handles visibility, file selection, and preview lifecycle.
 */
export function useAssetUploader(): UseAssetUploaderResult {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Keep track of blob URLs for cleanup
  const blobUrlRef = useRef<string | null>(null);

  const revokeCurrentBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      revokeCurrentBlob();
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setSelectedFile(file);
      setPreviewUrl(url);
    },
    [revokeCurrentBlob]
  );

  const clearSelection = useCallback(() => {
    revokeCurrentBlob();
    setSelectedFile(null);
    setPreviewUrl(null);
  }, [revokeCurrentBlob]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    clearSelection();
  }, [clearSelection]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        clearSelection();
      }
      return !prev;
    });
  }, [clearSelection]);

  return {
    isOpen,
    toggle,
    open,
    close,
    selectedFile,
    previewUrl,
    handleFileSelect,
    clearSelection,
  };
}
