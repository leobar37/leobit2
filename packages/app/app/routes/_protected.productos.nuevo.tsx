import { useState } from "react";
import { useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Loader2, Save, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateProduct } from "~/hooks/use-products";
import { FormPage } from "~/components/layout/form-page";
import { MobilePage } from "~/components/mobile/mobile-page";
import { ProductFormContent } from "~/components/products/product-form-content";
import { productSchema, type ProductFormData } from "~/lib/schemas/product-schema";
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
        imageId: data.imageId,
        hasVariants: hasVariants,
      });
      navigate(`/productos/${createdProduct.id}`);
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  const { isValid } = form.formState;

  return (
    <FormPage
      title="Nuevo Producto"
      backHref="/productos"
      icon={Package}
      toolbar={
        <Button
          onClick={form.handleResolvedSubmit(handleSubmit)}
          disabled={createProduct.isPending || !isValid}
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
        <div className="space-y-4">
          <ProductFormContent form={form} />

          {/* Variants Toggle Card */}
          <MobilePage.Card variant="flat" className="rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Layers className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <Label htmlFor="hasVariants" className="font-medium text-foreground cursor-pointer">
                      Este producto tiene variantes
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {hasVariants
                        ? "Podrás agregar variantes después de guardar"
                        : "Se creará automáticamente una variante con el nombre del producto"}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="hasVariants"
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </CardContent>
          </MobilePage.Card>
        </div>
      </WrapperFormProvider>
    </FormPage>
  );
}
