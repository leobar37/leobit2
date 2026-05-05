import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CameraGalleryDrawer } from "@/components/ui/camera-gallery-drawer";
import { useAssets, useUploadAsset, useDeleteAsset, type Asset } from "~/hooks/use-assets";

interface AssetGalleryProps {
  onSelect?: (asset: Asset) => void;
  selectedId?: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
}

export function AssetGallery({
  onSelect,
  selectedId,
  allowUpload = true,
  allowDelete = true,
}: AssetGalleryProps) {
  const { data: assets, isLoading } = useAssets();
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const [uploading, setUploading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastFileRef = useRef<File | null>(null);

  // Detect mobile viewport on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleUploadSuccess = (result: { id: string; filename: string; mimeType: string; sizeBytes: number; createdAt: string }) => {
    // Build a temporary Asset from the upload response so we can select it
    // immediately without waiting for the query cache to refresh.
    const file = lastFileRef.current;
    const tempAsset: Asset = {
      id: result.id,
      filename: result.filename,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      createdAt: result.createdAt,
      url: file ? URL.createObjectURL(file) : "",
    };
    if (onSelect) {
      onSelect(tempAsset);
    }
  };

  const handleDrawerFileSelect = async (file: File) => {
    lastFileRef.current = file;
    setUploading(true);
    try {
      const result = await uploadAsset.mutateAsync(file);
      handleUploadSuccess(result);
    } catch (err) {
      console.error("Error uploading asset:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    lastFileRef.current = file;
    setUploading(true);
    try {
      const result = await uploadAsset.mutateAsync(file);
      handleUploadSuccess(result);
    } catch (err) {
      console.error("Error uploading asset:", err);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allowUpload && (
        <>
          {isMobile ? (
            <Button
              onClick={() => setDrawerOpen(true)}
              variant="outline"
              className="rounded-xl w-full"
              disabled={uploading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {uploading ? "Subiendo..." : "Subir imagen"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
                onChange={handleFileSelect}
                className="hidden"
                id="asset-upload"
                disabled={uploading}
              />
              <label htmlFor="asset-upload">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={uploading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {uploading ? "Subiendo..." : "Subir imagen"}
                </Button>
              </label>
            </div>
          )}

          <CameraGalleryDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onFileSelect={handleDrawerFileSelect}
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
            title="Adjuntar imagen"
          />
        </>
      )}

      {!assets || assets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No hay imágenes en la galería</p>
          <p className="text-sm">Sube imágenes para usar en productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className={`group overflow-hidden cursor-pointer transition-all ${
                selectedId === asset.id
                  ? "ring-2 ring-orange-500"
                  : "hover:shadow-md"
              }`}
              onClick={() => onSelect?.(asset)}
            >
              <CardContent className="p-0 relative">
                <div className="aspect-square">
                  {asset.mimeType.startsWith("video/") ? (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                {allowDelete && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAsset.mutate(asset.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
