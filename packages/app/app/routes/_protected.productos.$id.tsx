// @ts-nocheck - Route file with complex type errors
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useUpdateProduct } from "~/hooks/use-products";
import { useProduct } from "~/hooks/use-products-live";
import {
  ProductForm,
  type ProductFormData,
} from "~/components/products/product-form";
import { VariantList } from "~/components/products/variant-list";
import { type VariantFormData } from "~/components/products/variant-form";
import { MobilePage, MobileShell, MobileSlot } from "~/components/mobile";
import {
  useVariantsByProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeactivateVariant,
  useReorderVariants,
  type ProductVariant,
} from "~/hooks/use-product-variants";
import {
  VariantModal,
  useVariantModal,
} from "~/components/products/variant-modal";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { getCategoryColor } from "~/lib/utils/category-colors";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: product, isLoading: isProductLoading } = useProduct(id!);
  const updateProduct = useUpdateProduct();

  const {
    data: variants,
    isLoading: isVariantsLoading,
    refetch: refetchVariants,
  } = useVariantsByProduct(id || "", { includeInactive: true });
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deactivateVariant = useDeactivateVariant();
  const reorderVariants = useReorderVariants();

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const variantModal = useVariantModal();

  // Determine if product currently has multiple real variants (not just the auto-created one)
  const hasMultipleVariants = (variants?.length ?? 0) > 1;
  const isSimpleProduct = !product?.hasVariants && !hasMultipleVariants;

  // Toggle state: initialized from product data
  const [showVariants, setShowVariants] = useState(false);

  useEffect(() => {
    if (product) {
      setShowVariants(product.hasVariants === true || hasMultipleVariants);
    }
  }, [product, hasMultipleVariants]);

  // Track if any update mutation is pending
  const isUpdating = updateProduct.isPending || updateVariant.isPending;

  const handleSubmit = async (data: ProductFormData) => {
    if (!id) return;

    try {
      await updateProduct.mutateAsync({
        id,
        input: data,
      });

      if (isSimpleProduct && variants && variants.length > 0) {
        const variantId = variants[0].id;
        await updateVariant.mutateAsync({
          id: variantId,
          input: {
            name: data.name,
            unitQuantity: 1,
            price: Number.parseFloat(data.basePrice),
            isActive: data.isActive,
          },
        });
        await refetchVariants();
      }

      toast.success("Producto actualizado");
      navigate(`/productos/${id}`);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Error al actualizar el producto");
    }
  };

  const handleVariantSubmit = async (
    data: VariantFormData,
    variantId?: string,
  ) => {
    if (!id) return;

    const isEditing = !!variantId;

    try {
      if (variantId) {
        await updateVariant.mutateAsync({
          id: variantId,
          input: {
            name: data.name,
            sku: data.sku,
            unitQuantity: data.unitQuantity,
            price: data.price,
            isActive: data.isActive,
          },
        });
        toast.success("Variante actualizada");
      } else {
        await createVariant.mutateAsync({
          productId: id,
          input: {
            name: data.name,
            sku: data.sku,
            unitQuantity: data.unitQuantity,
            price: data.price,
            isActive: data.isActive,
          },
        });
        toast.success("Variante creada");
      }

      await refetchVariants();
    } catch (error) {
      console.error("Error saving variant:", error);
      toast.error(
        isEditing
          ? "Error al actualizar la variante"
          : "Error al crear la variante",
      );
    }
  };

  const handleVariantEdit = (variant: ProductVariant) => {
    variantModal.open({
      variant,
      onSubmit: (data) => handleVariantSubmit(data, variant.id),
      isLoading: createVariant.isPending || updateVariant.isPending,
      isEditing: true,
    });
  };

  const handleVariantAdd = () => {
    variantModal.open({
      onSubmit: (data) => handleVariantSubmit(data),
      isLoading: createVariant.isPending || updateVariant.isPending,
      isEditing: false,
    });
  };

  const handleVariantDelete = async (variantId: string) => {
    const confirmed = await confirm({
      title: "Desactivar variante",
      description:
        "¿Estás seguro de desactivar esta variante? Se mantendrá en el historial pero no estará disponible para nuevas ventas.",
      confirmText: "Desactivar",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      try {
        await deactivateVariant.mutateAsync(variantId);
        toast.success("Variante desactivada");
        await refetchVariants();
      } catch (error) {
        console.error("Error deactivating variant:", error);
        toast.error("Error al desactivar la variante");
      }
    }
  };

  const handleVariantReorder = async (variantIds: string[]) => {
    if (!id) return;
    try {
      await reorderVariants.mutateAsync({ productId: id, variantIds });
      await refetchVariants();
    } catch (error) {
      console.error("Error reordering variants:", error);
      toast.error("Error al reordenar las variantes");
    }
  };

  if (isProductLoading) {
    return (
      <MobilePage.Root className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Package className="h-5 w-5 animate-pulse" />
          <p>Cargando producto...</p>
        </div>
      </MobilePage.Root>
    );
  }

  if (!product) {
    return (
      <MobilePage.Root className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Producto no encontrado
          </p>
          <button
            onClick={() => navigate("/productos")}
            className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
          >
            Volver a productos
          </button>
        </div>
      </MobilePage.Root>
    );
  }

  return (
    <>
      <MobileShell.BackButton>
        <button
          onClick={() => navigate("/productos")}
          className="shell-toolbar-button -ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </MobileShell.BackButton>

      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate text-lg font-bold tracking-tight">
          {product.name}
        </h1>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <span className="text-sm font-semibold text-orange-600">
          S/ {product.basePrice}
        </span>
      </MobileSlot>

      <MobilePage.Root className="space-y-3">
        <section className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 dark:border-white/[0.07]">
          {product.category ? (
            <Badge
              className="max-w-[70%] truncate rounded-full border-0 px-2.5 py-1 text-xs"
              style={{
                backgroundColor: `${getCategoryColor(product.category.color)}18`,
                color: getCategoryColor(product.category.color),
              }}
            >
              {product.category.name}
            </Badge>
          ) : (
            <Badge className="rounded-full border-0 bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Sin categoría
            </Badge>
          )}
          <Badge
            variant={product.isActive ? "default" : "secondary"}
            className={`rounded-full border-0 px-2.5 py-1 text-xs ${
              product.isActive
                ? "bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/12 dark:text-emerald-300"
                : "bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            {product.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </section>

        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/productos")}
          isLoading={isUpdating}
          hasVariants={showVariants}
          variantCount={variants?.length || 0}
        />

        {/* Variants Toggle */}
        <section className="border-b border-border/60 pb-4 dark:border-white/[0.07]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-orange-500" />
              <div>
                <Label
                  htmlFor="showVariants"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  Este producto tiene variantes
                </Label>
                <p className="text-xs text-muted-foreground">
                  {showVariants
                    ? "Gestiona las variantes del producto"
                    : "Activa para agregar presentaciones o tamaños"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="showVariants"
                type="checkbox"
                checked={showVariants}
                onChange={(e) => setShowVariants(e.target.checked)}
                disabled={hasMultipleVariants}
                className="sr-only peer"
              />
              <div className="peer h-5 w-10 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
            </label>
          </div>
        </section>

        {showVariants && (
          <VariantList
            variants={variants || []}
            isLoading={isVariantsLoading}
            onAdd={handleVariantAdd}
            onEdit={handleVariantEdit}
            onDelete={handleVariantDelete}
            onReorder={handleVariantReorder}
          />
        )}

        <VariantModal />
        <ConfirmDialog />
      </MobilePage.Root>
    </>
  );
}
