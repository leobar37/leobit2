/**
 * Hook for managing purchase receipt file state
 * Extracted from PurchaseFormContext for better testability
 */
import { useState, useCallback } from "react";

export interface UsePurchaseReceiptReturn {
  receiptFile: File | null;
  receiptPreview: string | null;
  fileUploadStatus: {
    isUploading: boolean;
    isPending: boolean;
    isError: boolean;
  };
  handleReceiptSelect: (file: File, onChange?: (value: File | undefined) => void) => void;
  handleReceiptClear: (onChange?: (value: undefined) => void) => void;
}

export function usePurchaseReceipt(): UsePurchaseReceiptReturn {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [fileUploadStatus, setFileUploadStatus] = useState({
    isUploading: false,
    isPending: false,
    isError: false,
  });

  const handleReceiptSelect = useCallback(
    (file: File, onChange?: (value: File | undefined) => void) => {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      setFileUploadStatus({ isUploading: false, isPending: true, isError: false });
      onChange?.(file);
    },
    []
  );

  const handleReceiptClear = useCallback(
    (onChange?: (value: undefined) => void) => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
      setReceiptFile(null);
      setReceiptPreview(null);
      setFileUploadStatus({ isUploading: false, isPending: false, isError: false });
      onChange?.(undefined);
    },
    [receiptPreview]
  );

  return {
    receiptFile,
    receiptPreview,
    fileUploadStatus,
    handleReceiptSelect,
    handleReceiptClear,
  };
}
