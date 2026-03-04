import { useNavigate } from "react-router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateProduct } from "~/hooks/use-products";
import { FormPage } from "~/components/layout/form-page";
import {
  ProductFormContent,
  productSchema,
  type ProductFormData,
} from "~/components/products/product-form-content";

export default function NuevoProductoPage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "pollo",
      unit: "kg",
      basePrice: "",
      isActive: true,
      imageId: undefined,
    },
  });

  const handleSubmit = async (data: ProductFormData) => {
    try {
      await createProduct.mutateAsync({
        name: data.name,
        type: data.type,
        unit: data.unit,
        basePrice: data.basePrice,
        isActive: data.isActive,
      });
      navigate("/productos");
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
          onClick={form.handleSubmit(handleSubmit)}
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
      <FormProvider {...form}>
        <ProductFormContent form={form} />
      </FormProvider>
    </FormPage>
  );
}
