import { describe, it, expect, vi, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Window } from "happy-dom";
import { usePurchaseReceipt } from "./use-purchase-receipt";

beforeAll(() => {
  const window = new Window();
  global.document = window.document as unknown as Document;
  global.window = window as unknown as Window & typeof globalThis;
});

describe("usePurchaseReceipt", () => {
  it("should start with null file and preview", () => {
    const { result } = renderHook(() => usePurchaseReceipt());
    expect(result.current.receiptFile).toBeNull();
    expect(result.current.receiptPreview).toBeNull();
    expect(result.current.fileUploadStatus.isPending).toBe(false);
  });

  it("should select a file and create preview", () => {
    const { result } = renderHook(() => usePurchaseReceipt());
    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    const onChange = vi.fn();

    act(() => {
      result.current.handleReceiptSelect(file, onChange);
    });

    expect(result.current.receiptFile).toBe(file);
    expect(result.current.receiptPreview).toContain("blob:");
    expect(result.current.fileUploadStatus.isPending).toBe(true);
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("should clear file and revoke preview", () => {
    const { result } = renderHook(() => usePurchaseReceipt());
    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    const onChange = vi.fn();

    act(() => {
      result.current.handleReceiptSelect(file, onChange);
    });

    act(() => {
      result.current.handleReceiptClear(onChange);
    });

    expect(result.current.receiptFile).toBeNull();
    expect(result.current.receiptPreview).toBeNull();
    expect(result.current.fileUploadStatus.isPending).toBe(false);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
