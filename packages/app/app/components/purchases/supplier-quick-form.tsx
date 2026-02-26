import { useState } from "react";
import { Building2, Loader2, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useCreateSupplier } from "~/hooks/use-suppliers";
import type { Supplier } from "~/hooks/use-suppliers";

const quickSupplierSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  ruc: z.string().optional(),
  phone: z.string().optional(),
  type: z.enum(["generic", "regular", "internal"]),
});

type QuickSupplierFormData = z.infer<typeof quickSupplierSchema>;

interface SupplierQuickFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (supplier: Supplier) => void;
  onCancel?: () => void;
}

export function SupplierQuickForm({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
}: SupplierQuickFormProps) {
  const [error, setError] = useState<string | null>(null);
  const { mutate: createSupplier, isPending } = useCreateSupplier();

  const form = useForm<QuickSupplierFormData>({
    resolver: zodResolver(quickSupplierSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      ruc: "",
      phone: "",
      type: "regular",
    },
  });

  const handleClose = () => {
    form.reset();
    setError(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    handleClose();
    onCancel?.();
  };

  const onSubmit = form.handleSubmit((data) => {
    setError(null);
    createSupplier(data, {
      onSuccess: (supplier) => {
        onSuccess(supplier);
        handleClose();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Error al crear proveedor");
      },
    });
  });

  const isFormValid = form.formState.isValid;

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Nuevo Proveedor
            </DrawerTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <form onSubmit={onSubmit} className="px-4 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nombre *
            </Label>
            <Input
              id="name"
              placeholder="Ej: Granja El Sol"
              {...form.register("name")}
              className="rounded-xl"
              autoFocus
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ruc" className="text-sm font-medium">
              RUC
            </Label>
            <Input
              id="ruc"
              placeholder="Ej: 20123456789"
              {...form.register("ruc")}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Teléfono
            </Label>
            <Input
              id="phone"
              placeholder="Ej: 987654321"
              {...form.register("phone")}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Tipo
            </Label>
            <select
              id="type"
              {...form.register("type")}
              className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="regular">Regular</option>
              <option value="internal">Interno</option>
              <option value="generic">Genérico</option>
            </select>
          </div>

          <DrawerFooter className="px-0 pt-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1 rounded-xl"
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600 rounded-xl"
                disabled={isPending || !isFormValid}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
