import { useState } from "react";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadAsset.mutateAsync(file);
      // Auto-select the newly uploaded asset
      const newAsset = assets?.find((a) => a.id === result.id);
      if (newAsset && onSelect) {
        onSelect(newAsset);
      }
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
              asChild
            >
              <span>
                <Plus className="h-4 w-4 mr-2" />
                {uploading ? "Subiendo..." : "Subir imagen"}
              </span>
            </Button>
          </label>
        </div>
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
              className={`overflow-hidden cursor-pointer transition-all ${
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
