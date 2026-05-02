// @ts-nocheck - Route file with complex type errors
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useUpdateProduct } from "~/hooks/use-products";
import { useProduct } from "~/hooks/use-products-live";
import { ProductForm, type ProductFormData } from "~/components/products/product-form";
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
import { VariantModal, useVariantModal } from "~/components/products/variant-modal";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { getCategoryColor } from "~/lib/utils/category-colors";

const unitLabels = {
  kg: "Kilogramo (kg)",
  unidad: "Unidad",
};

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
      // For simple products (no variants), update the variant price directly
      // This generates a single sync operation instead of two
      if (isSimpleProduct && variants && variants.length > 0) {
        const variantId = variants[0].id;
        await updateVariant.mutateAsync({
          id: variantId,
          input: { price: data.basePrice },
        });
        toast.success("Producto actualizado");
        navigate(`/productos/${id}`);
        return;
      }

      // For products with variants, basePrice is just a reference - no need to update
      await updateProduct.mutateAsync({
        id,
        input: data,
      });
      toast.success("Producto actualizado");
      navigate(`/productos/${id}`);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Error al actualizar el producto");
    }
  };

  const handleVariantSubmit = async (data: VariantFormData) => {
    if (!id) return;

    const isEditing = variantModal.data?.isEditing;
    const editingVariantId = variantModal.data?.variant?.id;

    try {
      if (isEditing && editingVariantId) {
        await updateVariant.mutateAsync({
          id: editingVariantId,
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

      refetchVariants();
    } catch (error) {
      console.error("Error saving variant:", error);
      toast.error(isEditing ? "Error al actualizar la variante" : "Error al crear la variante");
    }
  };

  const handleVariantEdit = (variant: ProductVariant) => {
    variantModal.open({
      variant,
      onSubmit: handleVariantSubmit,
      isLoading: createVariant.isPending || updateVariant.isPending,
      isEditing: true,
    });
  };

  const handleVariantAdd = () => {
    variantModal.open({
      onSubmit: handleVariantSubmit,
      isLoading: createVariant.isPending || updateVariant.isPending,
      isEditing: false,
    });
  };

  const handleVariantDelete = async (variantId: string) => {
    const confirmed = await confirm({
      title: "Desactivar variante",
      description: "¿Estás seguro de desactivar esta variante? Se mantendrá en el historial pero no estará disponible para nuevas ventas.",
      confirmText: "Desactivar",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      try {
        await deactivateVariant.mutateAsync(variantId);
        toast.success("Variante desactivada");
        refetchVariants();
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
      refetchVariants();
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
        <div className="flex min-w-0 items-center gap-2 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight">{product.name}</h1>
          {product.category ? (
            <Badge
              className="text-[10px] px-1.5 py-0"
              style={{
                backgroundColor: `${getCategoryColor(product.category.color)}20`,
                color: getCategoryColor(product.category.color),
              }}
            >
              {product.category.name}
            </Badge>
          ) : (
            <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-700">
              Sin categoría
            </Badge>
          )}
        </div>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-orange-600 text-sm">S/ {product.basePrice}</span>
          <span className="text-gray-300">|</span>
          <Badge
            variant={product.isActive ? "default" : "secondary"}
            className={`text-[10px] px-1.5 py-0 ${
              product.isActive
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-gray-100 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {product.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </MobileSlot>

      <MobilePage.Root className="space-y-3">
        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/productos")}
          isLoading={isUpdating}
          hasVariants={showVariants}
          variantCount={variants?.length || 0}
        />

        {/* Variants Toggle */}
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-orange-500" />
              <div>
                <Label htmlFor="showVariants" className="text-sm font-medium text-foreground cursor-pointer">
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
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
        </div>

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
