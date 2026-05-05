import { useState } from "react";
import { ImagePlus, Search, Trash2, ImageIcon, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CameraGalleryDrawer } from "@/components/ui/camera-gallery-drawer";
import { useAssets, useUploadAsset, useDeleteAsset } from "~/hooks/use-assets";
import { useAssetFilters } from "~/hooks/use-asset-filters";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { MobilePage, MobileSlot } from "~/components/mobile";

export default function ActivosPage() {
  const { data: assets, isLoading, error } = useAssets();
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);

  const { search, setSearch, filteredAssets } = useAssetFilters({ assets });

  const handleFileSelect = async (file: File) => {
    try {
      await uploadAsset.mutateAsync(file);
    } catch (error) {
      console.error("Error uploading asset:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar imagen",
      description: "¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      deleteAsset.mutate(id);
    }
  };

  return (
    <>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="font-bold text-lg">Activos</h1>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <Button
          className="bg-orange-500 hover:bg-orange-600 rounded-xl"
          onClick={() => setUploadDrawerOpen(true)}
          disabled={uploadAsset.isPending}
        >
          {uploadAsset.isPending ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-1" />
          )}
          {uploadAsset.isPending ? "Subiendo" : "Subir"}
        </Button>
      </MobileSlot>

      <MobilePage.Root>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar activos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="shell-search-field pl-10 pr-4"
            />
          </div>

          {isLoading && (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">Error al cargar activos</p>
            </div>
          )}

          {filteredAssets?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg text-muted-foreground">No hay activos</p>
              <p className="text-sm text-muted-foreground">
                Sube imágenes para usar en productos
              </p>
              <Button
                className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-xl"
                onClick={() => setUploadDrawerOpen(true)}
                disabled={uploadAsset.isPending}
              >
                {uploadAsset.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                {uploadAsset.isPending ? "Subiendo..." : "Subir primera imagen"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {filteredAssets?.map((asset) => (
              <Card
                key={asset.id}
                className="shell-card-flat overflow-hidden cursor-pointer transition-all hover:shadow-md"
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
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                    onClick={() => handleDelete(asset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MobilePage.Root>

      <CameraGalleryDrawer
        open={uploadDrawerOpen}
        onOpenChange={setUploadDrawerOpen}
        onFileSelect={handleFileSelect}
        title="Nueva imagen"
      />

      <ConfirmDialog />
    </>
  );
}
