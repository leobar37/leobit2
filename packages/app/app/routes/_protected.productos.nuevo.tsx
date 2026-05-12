import { useState } from "react";
import { useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Loader2, Save, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCreateProduct } from "~/hooks/use-products";
import { FormPage } from "~/components/layout/form-page";
import { ProductFormContent } from "~/components/products/product-form-content";
import {
  productSchema,
  type ProductFormData,
} from "~/lib/schemas/product-schema";
import { useWrapperForm, WrapperFormProvider } from "~/hooks/use-wrapper-form";
import { assetField } from "~/lib/forms/media-field-resolvers";

export default function NuevoProductoPage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  const [hasVariants, setHasVariants] = useState(false);

  const form = useWrapperForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      categoryId: null,
      unit: "kg",
      basePrice: "",
      isActive: true,
      imageId: undefined,
    },
    fields: {
      imageId: assetField(),
    },
  });

  const handleSubmit = async (data: ProductFormData) => {
    try {
      const createdProduct = await createProduct.mutateAsync({
        name: data.name,
        categoryId: data.categoryId ?? null,
        unit: data.unit,
        basePrice: data.basePrice,
        isActive: data.isActive,
        imageId: typeof data.imageId === "string" ? data.imageId : undefined,
        hasVariants: hasVariants,
      });
      navigate(`/productos/${createdProduct.id}`);
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Error al guardar el producto");
    }
  };

  const submitProductForm = form.handleSubmit(
    async (rawValues) => {
      const payload = await form.resolvePayload(rawValues);
      await handleSubmit(payload);
    },
    () => {
      toast.error("Completa nombre y precio para guardar");
    },
  );

  return (
    <FormPage
      title="Nuevo Producto"
      backHref="/productos"
      icon={Package}
      toolbar={
        <Button
          type="submit"
          form="new-product-form"
          disabled={createProduct.isPending}
          data-testid="save-product-button"
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {createProduct.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar Producto
            </>
          )}
        </Button>
      }
    >
      <WrapperFormProvider form={form}>
        <form
          id="new-product-form"
          onSubmit={submitProductForm}
          noValidate
          className="space-y-4"
        >
          <ProductFormContent form={form} />

          <section className="border-b border-border/60 pb-4 dark:border-white/[0.07]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-orange-500" />
                <div>
                  <Label
                    htmlFor="hasVariants"
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    Este producto tiene variantes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {hasVariants
                      ? "Podrás agregar variantes después de guardar"
                      : "Se creará automáticamente una variante con el nombre del producto"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  id="hasVariants"
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-10 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
          </section>
        </form>
      </WrapperFormProvider>
    </FormPage>
  );
}
