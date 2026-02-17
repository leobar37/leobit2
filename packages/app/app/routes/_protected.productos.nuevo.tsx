import { Link, useNavigate } from "react-router";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm, type ProductFormData } from "~/components/products/product-form";
import { useCreateProduct } from "~/hooks/use-products";

export default function NuevoProductoPage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/productos">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <h1 className="font-bold text-lg">Nuevo Producto</h1>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto">
          <ProductForm
            onSubmit={handleSubmit}
            onCancel={() => navigate("/productos")}
            isLoading={createProduct.isPending}
          />
        </div>
      </main>
    </div>
  );
}
