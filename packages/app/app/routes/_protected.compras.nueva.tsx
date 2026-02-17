import { useNavigate } from "react-router";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingCart, Plus, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { useCreatePurchase } from "~/hooks/use-purchases";
import { useSuppliers } from "~/hooks/use-suppliers";
import { useProducts } from "~/hooks/use-products";
import { useSetLayout } from "~/components/layout/app-layout";

const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0, "El costo no puede ser negativo"),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Selecciona un proveedor"),
  purchaseDate: z.string().min(1, "La fecha es requerida"),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Agrega al menos un producto"),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function NuevaCompraPage() {
  const navigate = useNavigate();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();

  useSetLayout({
    title: "Nueva Compra",
    showBackButton: true,
    backHref: "/compras",
  });

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    mode: "onChange",
    defaultValues: {
      supplierId: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = form.handleSubmit((data) => {
    createPurchase(data, {
      onSuccess: () => {
        navigate("/compras");
      },
    });
  });

  const addItem = () => {
    append({ productId: "", quantity: 0, unitCost: 0 });
  };

  const items = form.watch("items");
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0),
    0
  );

  const isFormValid = form.formState.isValid;
  const supplierId = form.watch("supplierId");

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Registra una nueva compra de productos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Proveedor *
            </label>
            <select
              {...form.register("supplierId")}
              className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Seleccionar proveedor...</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {form.formState.errors.supplierId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.supplierId.message}
              </p>
            )}
          </div>

          <FormInput
            name="purchaseDate"
            label="Fecha de compra"
            type="date"
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Productos *</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <Card key={field.id} className="border-0 shadow-md rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs">Producto</label>
                      <select
                        {...form.register(`items.${index}.productId`)}
                        className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                      >
                        <option value="">Seleccionar producto...</option>
                        {products?.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {form.formState.errors.items?.[index]?.productId && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.items[index]?.productId?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        name={`items.${index}.quantity`}
                        label="Cantidad"
                        type="number"
                        min="0.001"
                        step="0.001"
                      />
                      <FormInput
                        name={`items.${index}.unitCost`}
                        label="Costo unitario (S/)"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Subtotal: S/ {" "}
                        {(
                          (form.watch(`items.${index}.quantity`) || 0) *
                          (form.watch(`items.${index}.unitCost`) || 0)
                        ).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {form.formState.errors.items?.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.root.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Notas
            </label>
            <textarea
              {...form.register("notes")}
              rows={3}
              placeholder="Información adicional sobre la compra"
              className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
            <span className="font-medium">Total:</span>
            <span className="text-xl font-bold">S/ {totalAmount.toFixed(2)}</span>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
            disabled={isPending || !isFormValid || !supplierId || fields.length === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Compra
              </>
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
