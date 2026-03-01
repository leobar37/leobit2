import { useState } from "react";
import { ImagePlus, Search, Trash2, ImageIcon, Upload, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileUploader } from "@/components/ui/file-uploader";
import { useAssets, useUploadAsset, useDeleteAsset, type Asset } from "~/hooks/use-assets";
import { useFileUpload } from "~/hooks/use-file-upload";

export default function ActivosPage() {
  const [search, setSearch] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: assets, isLoading, error } = useAssets();
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const fileUpload = useFileUpload({ endpoint: "/assets/upload" });

  const filteredAssets = assets?.filter((asset) =>
    asset.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClear = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await fileUpload.upload(selectedFile);
    
    if (result.status === "synced") {
      handleClear();
      setShowUploader(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar esta imagen?")) {
      deleteAsset.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4">
          <h1 className="font-bold text-lg">Activos</h1>
          <div className="flex items-center gap-2">
            <Button
              className="bg-orange-500 hover:bg-orange-600 rounded-xl"
              onClick={() => setShowUploader(!showUploader)}
            >
              <ImagePlus className="h-4 w-4 mr-1" />
              Subir
            </Button>
          </div>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-24">
        {showUploader && (
          <Card className="mb-4">
            <CardContent className="p-4 space-y-4">
              <FileUploader
                file={selectedFile}
                previewUrl={previewUrl}
                status={fileUpload.isUploading ? "uploading" : fileUpload.isPending ? "pending" : "idle"}
                error={fileUpload.isError ? "Error al subir" : null}
                label="Nueva imagen"
                helperText="Sube imágenes para usar en productos"
                onFileSelect={handleFileSelect}
                onClear={handleClear}
              />
              {selectedFile && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-orange-500 hover:bg-orange-600 rounded-xl"
                    onClick={handleUpload}
                    disabled={fileUpload.isUploading}
                  >
                    {fileUpload.isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      handleClear();
                      setShowUploader(false);
                    }}
                    disabled={fileUpload.isUploading}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar activos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
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
                onClick={() => setShowUploader(true)}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Subir primera imagen
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {filteredAssets?.map((asset) => (
              <Card
                key={asset.id}
                className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
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
      </main>
    </div>
  );
}
