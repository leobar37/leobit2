import { describe, it, expect, vi, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { renderHook, act } from "@testing-library/react";
import { useWrapperForm } from "../use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";
import * as mediaClient from "~/lib/media/media-client";

const windowInstance = new Window();
Object.defineProperty(globalThis, "document", {
  value: windowInstance.document,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "window", {
  value: windowInstance,
  configurable: true,
  writable: true,
});

vi.mock("~/lib/media/media-client", () => ({
  uploadMediaFile: vi.fn(),
}));

describe("useWrapperForm", () => {
  it("behaves like normal useForm without field resolvers", async () => {
    const { result } = renderHook(() =>
      useWrapperForm<{ name: string }>({
        defaultValues: { name: "test" },
      })
    );

    expect(result.current.getValues("name")).toBe("test");

    const payload = await result.current.resolvePayload();
    expect(payload).toEqual({ name: "test" });
  });

  it("resolvePayload resolves configured fields", async () => {
    (mediaClient.uploadMediaFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "file-id",
      filename: "test.png",
      mimeType: "image/png",
      sizeBytes: 4,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const { result } = renderHook(() =>
      useWrapperForm<{ name: string; imageId?: string | File | null }>({
        defaultValues: { name: "product", imageId: undefined },
        fields: {
          imageId: fileField(),
        },
      })
    );

    act(() => {
      result.current.setValue("imageId", new File(["x"], "x.png", { type: "image/png" }) as unknown as string);
    });

    const payload = await result.current.resolvePayload();
    expect(payload.name).toBe("product");
    expect(payload.imageId).toBe("file-id");
  });

  it("resolvePayload keeps string ID unchanged", async () => {
    const { result } = renderHook(() =>
      useWrapperForm<{ imageId?: string | null }>({
        defaultValues: { imageId: "existing-id" },
        fields: {
          imageId: fileField(),
        },
      })
    );

    const payload = await result.current.resolvePayload();
    expect(payload.imageId).toBe("existing-id");
  });

  it("resolvePayload keeps object-with-id unchanged", async () => {
    const { result } = renderHook(() =>
      useWrapperForm<{ imageId?: string | { id: string } | null }>({
        defaultValues: { imageId: { id: "resolved-id" } },
        fields: {
          imageId: fileField(),
        },
      })
    );

    const payload = await result.current.resolvePayload();
    expect(payload.imageId).toBe("resolved-id");
  });

  it("getFieldResolver returns resolver for configured field", () => {
    const { result } = renderHook(() =>
      useWrapperForm<{ imageId?: string }>({
        fields: {
          imageId: fileField(),
        },
      })
    );

    const resolver = result.current.getFieldResolver("imageId");
    expect(resolver).toBeDefined();
    expect(resolver?.kind).toBe("file");

    const missing = result.current.getFieldResolver("name" as "imageId");
    expect(missing).toBeUndefined();
  });

  it("handleResolvedSubmit calls callback with resolved payload", async () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useWrapperForm<{ name: string }>({
        defaultValues: { name: "test" },
      })
    );

    const submitHandler = result.current.handleResolvedSubmit(callback);
    await act(async () => {
      await submitHandler({ preventDefault: vi.fn() } as unknown as React.BaseSyntheticEvent);
    });

    expect(callback).toHaveBeenCalledWith({ name: "test" });
  });
});
