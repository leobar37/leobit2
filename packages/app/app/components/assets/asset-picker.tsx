import { useState } from "react";
import { X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
            src={selectedAsset?.url || ""}
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-32 h-32 rounded-xl border-dashed flex flex-col gap-2"
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{placeholder}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Galería de imágenes</DialogTitle>
            </DialogHeader>
            <AssetGallery
              onSelect={handleSelect}
              selectedId={value}
              allowUpload={true}
              allowDelete={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
