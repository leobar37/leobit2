import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, Plus, Trash2, Edit2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatKilos } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePurchaseForm } from "~/components/purchases/purchase-form-context";
import { getPurchaseCalculatorPath } from "~/lib/purchases/navigation";

export default function CompraEditarIndexPage() {
  const navigate = useNavigate();
  const {
    purchaseId,
    items,
    removeItem,
    supplier,
    totalAmount,
    isLoading,
    isPending,
    onSave,
  } = usePurchaseForm();

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-pulse" />
          <p>Cargando compra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell">
      <header className="sticky top-0 z-40 rounded-3xl border shell-surface">
        <div className="flex h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/compras/${purchaseId}`)}
              className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">Editar Compra</h1>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-orange-700 shadow-sm backdrop-blur-sm">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold">
                S/ {formatCurrency(totalAmount)}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-32 space-y-4">
        <Card className="shell-card-flat overflow-hidden rounded-[30px]">
          <div className="border-b shell-divider bg-orange-50/80 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
                <span className="text-2xl">🏭</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="truncate text-lg font-bold text-foreground">
                  {supplier?.name || "Sin proveedor"}
                </h2>
                <Badge className="mt-2 bg-yellow-100 text-yellow-700">
                  Editando
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="shell-card-flat overflow-hidden rounded-[30px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-xl">📦</span>
                Productos ({items.length})
              </CardTitle>
              <Button
                size="sm"
                className="rounded-xl bg-orange-500 hover:bg-orange-600"
                onClick={() => navigate(getPurchaseCalculatorPath(purchaseId!))}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="shell-card-soft flex items-center justify-between rounded-[20px] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    {item.variantName && (
                      <p className="text-sm text-muted-foreground">
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatKilos(parseFloat(item.quantity))} × S/{" "}
                      {formatCurrency(parseFloat(item.unitCost))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-orange-600">
                      S/ {formatCurrency(parseFloat(item.totalCost))}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          navigate(getPurchaseCalculatorPath(purchaseId!));
                        }}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-orange-100 hover:text-orange-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No hay productos en esta compra
                  </p>
                  <Button
                    className="rounded-xl bg-orange-500 hover:bg-orange-600"
                    onClick={() => navigate(getPurchaseCalculatorPath(purchaseId!))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-lg mx-auto space-y-2">
          <Button
            onClick={onSave}
            disabled={isPending}
            className="w-full h-14 rounded-xl text-lg font-semibold bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Guardar Compra
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
