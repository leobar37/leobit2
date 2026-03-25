import { useState, useEffect } from "react";
import { X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAsset } from "~/hooks/use-assets";
import { AssetGallery } from "./asset-gallery";
import type { Asset } from "~/hooks/use-assets";

interface AssetPickerProps {
  value?: string;
  onChange: (assetId: string | undefined) => void;
  placeholder?: string;
}

export function AssetPicker({
  value,
  onChange,
  placeholder = "Seleccionar imagen",
}: AssetPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  
  // Cargar asset desde el backend cuando tenemos value pero no selectedAsset
  const { data: fetchedAsset } = useAsset(value || "");
  
  // Actualizar selectedAsset cuando se carga el asset desde el backend
  useEffect(() => {
    if (fetchedAsset && !selectedAsset) {
      setSelectedAsset(fetchedAsset);
    }
  }, [fetchedAsset, selectedAsset]);

  const handleSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    onChange(asset.id);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedAsset(undefined);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      {selectedAsset || value ? (
        <div className="relative inline-block">
          <img
            src={selectedAsset?.url || undefined}
            alt="Selected"
            className="w-32 h-32 object-cover rounded-xl"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger
            className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-xl border border-dashed border-input bg-background hover:bg-accent hover:text-accent-foreground gap-2 cursor-pointer"
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{placeholder}</span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="px-4 pb-3 pt-2">
              <DrawerTitle>Galería de imágenes</DrawerTitle>
            </DrawerHeader>
            <AssetGallery
              onSelect={handleSelect}
              selectedId={value}
              allowUpload={true}
              allowDelete={true}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
