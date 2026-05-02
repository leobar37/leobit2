import { describe, it, expect, vi, beforeEach } from "vitest";
import { fileField, assetField } from "../media-field-resolvers";
import * as mediaClient from "~/lib/media/media-client";

vi.mock("~/lib/media/media-client", () => ({
  uploadMediaFile: vi.fn(),
}));

describe("media field resolvers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fileField", () => {
    it("returns null for null value", async () => {
      const resolver = fileField();
      const result = await resolver.toServer(null, {});
      expect(result).toBeNull();
    });

    it("returns undefined for undefined value", async () => {
      const resolver = fileField();
      const result = await resolver.toServer(undefined, {});
      expect(result).toBeUndefined();
    });

    it("returns string ID unchanged", async () => {
      const resolver = fileField();
      const result = await resolver.toServer("existing-id", {});
      expect(result).toBe("existing-id");
    });

    it("returns id from object with id", async () => {
      const resolver = fileField();
      const result = await resolver.toServer({ id: "obj-id", url: "https://example.com" }, {});
      expect(result).toBe("obj-id");
    });

    it("uploads File and returns uploaded ID", async () => {
      const resolver = fileField();
      const file = new File(["test"], "test.png", { type: "image/png" });
      (mediaClient.uploadMediaFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "uploaded-id",
        filename: "test.png",
        mimeType: "image/png",
        sizeBytes: 4,
        createdAt: "2024-01-01T00:00:00Z",
      });

      const result = await resolver.toServer(file, {});
      expect(result).toBe("uploaded-id");
      expect(mediaClient.uploadMediaFile).toHaveBeenCalledWith("/files/upload", file);
    });
  });

  describe("assetField", () => {
    it("uploads File to assets endpoint", async () => {
      const resolver = assetField();
      const file = new File(["test"], "test.png", { type: "image/png" });
      (mediaClient.uploadMediaFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "asset-id",
        filename: "test.png",
        mimeType: "image/png",
        sizeBytes: 4,
        createdAt: "2024-01-01T00:00:00Z",
      });

      const result = await resolver.toServer(file, {});
      expect(result).toBe("asset-id");
      expect(mediaClient.uploadMediaFile).toHaveBeenCalledWith("/assets/upload", file);
    });
  });
});
