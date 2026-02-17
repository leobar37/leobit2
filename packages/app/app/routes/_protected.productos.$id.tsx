import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import { ArrowLeft, Package, DollarSign, Tag, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpdateProduct } from "~/hooks/use-products";
import { useProduct } from "~/hooks/use-products-live";
import { ProductForm, type ProductFormData } from "~/components/products/product-form";
import { VariantList } from "~/components/products/variant-list";
import { VariantForm, type VariantFormData } from "~/components/products/variant-form";
import {
  useVariantsByProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeactivateVariant,
  useReorderVariants,
  type ProductVariant,
} from "~/hooks/use-product-variants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const typeLabels = {
  pollo: "Pollo",
  huevo: "Huevo",
  otro: "Otro",
};

const typeBadgeClasses = {
  pollo: "bg-orange-100 text-orange-700",
  huevo: "bg-yellow-100 text-yellow-700",
  otro: "bg-gray-100 text-gray-700",
};

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

  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);

  const handleSubmit = async (data: ProductFormData) => {
    if (!id) return;

    await updateProduct.mutateAsync({
      id,
      ...data,
    });

    navigate(`/productos/${id}`);
  };

  const handleVariantSubmit = async (data: VariantFormData) => {
    if (!id) return;

    if (editingVariant) {
      await updateVariant.mutateAsync({
        id: editingVariant.id,
        input: {
          name: data.name,
          sku: data.sku,
          unitQuantity: data.unitQuantity,
          price: data.price,
          isActive: data.isActive,
        },
      });
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
    }

    setIsVariantDialogOpen(false);
    setEditingVariant(null);
    refetchVariants();
  };

  const handleVariantEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setIsVariantDialogOpen(true);
  };

  const handleVariantAdd = () => {
    setEditingVariant(null);
    setIsVariantDialogOpen(true);
  };

  const handleVariantDelete = async (variantId: string) => {
    if (confirm("¿Estás seguro de desactivar esta variante?")) {
      await deactivateVariant.mutateAsync(variantId);
      refetchVariants();
    }
  };

  const handleVariantReorder = async (variantIds: string[]) => {
    if (!id) return;
    await reorderVariants.mutateAsync({ productId: id, variantIds });
    refetchVariants();
  };

  if (isProductLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Package className="h-5 w-5 animate-pulse" />
          <p>Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-4">
          <button
            onClick={() => navigate("/productos")}
            className="p-2 -ml-2 rounded-xl hover:bg-orange-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg truncate">Editar Producto</h1>
        </div>
      </header>

      <main className="p-4 pb-8 space-y-4">
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-white truncate">
                  {product.name}
                </h2>
                <Badge
                  className={`mt-2 ${typeBadgeClasses[product.type]}`}
                >
                  {typeLabels[product.type]}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Precio actual</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  S/ {product.basePrice}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Unidad</span>
                </div>
                <p className="text-lg font-medium">{unitLabels[product.unit]}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-4 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Creado el {new Date(product.createdAt).toLocaleDateString("es-PE")}</span>
              </div>
              <Badge
                variant={product.isActive ? "default" : "secondary"}
                className={
                  product.isActive
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                }
              >
                {product.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/productos")}
          isLoading={updateProduct.isPending}
        />

        <VariantList
          variants={variants || []}
          isLoading={isVariantsLoading}
          onAdd={handleVariantAdd}
          onEdit={handleVariantEdit}
          onDelete={handleVariantDelete}
          onReorder={handleVariantReorder}
        />

        <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVariant ? "Editar Variante" : "Nueva Variante"}
              </DialogTitle>
            </DialogHeader>
            <VariantForm
              variant={editingVariant || undefined}
              onSubmit={handleVariantSubmit}
              onCancel={() => {
                setIsVariantDialogOpen(false);
                setEditingVariant(null);
              }}
              isLoading={createVariant.isPending || updateVariant.isPending}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
