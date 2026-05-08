import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator as CalculatorIcon,
  Loader2,
  Search,
} from "lucide-react";
import { CalculatorInput } from "~/components/calculator/calculator-input";
import { BusinessMode } from "~/components/business-mode";
import { useSaleCalculator } from "./sale-calculator-context";
import { cn, formatCurrency, formatKilos } from "~/lib/utils";

export function CalculatorContent() {
  const {
    urlState,
    picker,
    calculator,
    settings,
    editing,
  } = useSaleCalculator();

  const {
    search,
    setSearch,
    filter,
    setFilter,
    productId,
    variantId,
  } = urlState;

  const {
    form,
    isValid,
    isKgProduct,
    values,
    toggleAutoCalculateField,
    isFieldAutoCalculated,
    setFieldValue,
    calculation,
    handleClear,
  } = calculator;

  const { hideTara, hidePrices } = settings;

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-5",
          picker.selectedVariant && "pb-40",
        )}
      >
        {/* Product Selector */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground">
                Producto
              </label>
              <p className="text-xs text-muted-foreground">
                {picker.activeProducts.length} disponibles
              </p>
            </div>
            {picker.isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Actualizando
              </div>
            )}
          </div>

          {picker.showProductDiscovery && (
            <div className="sticky top-0 z-10 -mx-1 space-y-2 shell-surface px-1 py-2 backdrop-blur-xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="sale-product-search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar producto..."
                  className="shell-search-field h-11 pl-10 pr-3 text-sm"
                />
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 hide-scrollbar">
                {[
                  { value: "all", label: "Todos" },
                  { value: "kg", label: "Por kilo" },
                  { value: "unidad", label: "Por unidad" },
                  ...picker.categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  })),
                  { value: "uncategorized", label: "Sin categoría" },
                ].map((f) => (
                  <button
                    key={f.value}
                    data-testid="sale-product-filter-chip"
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      filter === f.value
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-500 dark:text-orange-300"
                        : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {picker.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[20px] border border-border bg-card p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : picker.activeProducts.length === 0 ? (
            <Card className="shell-card-flat rounded-3xl">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No hay productos activos para vender.
              </CardContent>
            </Card>
          ) : picker.filteredProducts.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border bg-muted/50 p-5 text-center">
              <p className="font-semibold text-foreground">No encontramos productos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prueba con otro nombre o cambia el filtro.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-2",
                picker.showProductDiscovery && "gap-2.5",
              )}
            >
              {picker.filteredProducts.map((product) => {
                const isInCart = picker.isProductInCart(product.id);
                const isSelected = productId === product.id;

                return (
                  <button
                    key={product.id}
                    data-testid="sale-product-option"
                    type="button"
                    onClick={() => {
                      picker.selectProduct(product.id);
                      handleClear();
                    }}
                    disabled={isInCart}
                    className={cn(
                      "min-h-[86px] rounded-[22px] border p-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
                      isInCart
                        ? "cursor-not-allowed border-border/50 bg-muted opacity-55"
                        : isSelected
                          ? "border-orange-500/50 bg-orange-500/[0.14] shadow-[0_12px_28px_rgba(249,115,22,0.12)]"
                          : "border-border bg-card hover:border-border/80 hover:bg-accent",
                    )}
                  >
                    <div className="flex h-full flex-col justify-between gap-2">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground">
                        {product.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {product.unit === "kg" ? "Por kilo" : "Por unidad"}
                        </span>
                        {isInCart && (
                          <span className="rounded-full bg-orange-500/[0.12] px-2 py-0.5 text-[11px] font-semibold text-orange-500 dark:text-orange-300">
                            Agregado
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Variant Selector */}
        {picker.selectedProduct && (
          <div className="space-y-3 rounded-[24px] border border-border bg-muted/50 p-3">
            <div>
              <label className="text-sm font-semibold text-foreground">
                Presentación
              </label>
              <p className="text-xs text-muted-foreground">{picker.selectedProduct.name}</p>
            </div>
            {picker.isVariantsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[20px] border border-border bg-card p-3 space-y-2"
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : picker.variants.length === 0 ? (
              <Card className="shell-card-flat rounded-3xl">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Este producto no tiene presentaciones activas.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {picker.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        picker.selectVariant(variant.id);
                        handleClear();
                      }}
                      className={cn(
                        "rounded-[20px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
                        variantId === variant.id
                          ? "border-orange-500/50 bg-orange-500/[0.14]"
                          : "border-border bg-card hover:border-border/80 hover:bg-accent",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {variant.name}
                      </p>
                      {!hidePrices && (
                        <p className="mt-1 text-sm font-medium text-orange-500 dark:text-orange-300">
                          S/ {formatCurrency(variant.price)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                {picker.isVariantsFetching && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Actualizando presentaciones...
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Calculator Form */}
        {picker.selectedVariant && (
          <div className="space-y-4 rounded-[24px] border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500 dark:text-orange-300 ring-1 ring-orange-500/20">
                <CalculatorIcon className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-foreground">Calculadora</span>
                <p className="text-xs text-muted-foreground">{picker.selectedVariant.name}</p>
              </div>
            </div>

            {isKgProduct ? (
              <div className="space-y-3">
                <BusinessMode flag="useTara">
                  {!hideTara && (
                    <CalculatorInput
                      name="tara"
                      label="Tara (kg)"
                      value={values.tara}
                      placeholder="0.000"
                      onChange={(value) => setFieldValue("tara", value)}
                      fieldType="quantity"
                      isAutoCalculateTarget={false}
                      onToggleAutoCalculate={() => {}}
                      decimals={3}
                    />
                  )}
                </BusinessMode>
                <CalculatorInput
                  name="kilos"
                  label="Kilos netos"
                  value={values.quantity}
                  placeholder="0.000"
                    onChange={(value) => setFieldValue("quantity", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("quantity")
                  }
                  decimals={3}
                />
                <CalculatorInput
                  name="pricePerKg"
                  label="Precio por kg (S/)"
                  value={values.price}
                  placeholder={picker.selectedVariant?.price || "0.00"}
                    onChange={(value) => setFieldValue("price", value)}
                  fieldType="price"
                  isAutoCalculateTarget={isFieldAutoCalculated("price")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("price")
                  }
                  decimals={2}
                  helperText={
                    picker.selectedVariant?.price
                      ? `Precio base: S/ ${picker.selectedVariant.price}`
                      : undefined
                  }
                  helperValue={picker.selectedVariant?.price}
                  onApplyHelperValue={(value) =>
                    setFieldValue("price", value)
                  }
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                    onChange={(value) => setFieldValue("total", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("total")
                  }
                  decimals={2}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <CalculatorInput
                  name="packs"
                  label="Packs"
                  value={values.quantity}
                  placeholder="0"
                  onChange={(value) => setFieldValue("quantity", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("quantity")
                  }
                  decimals={0}
                />
                <CalculatorInput
                  name="pricePerPack"
                  label="Precio por pack (S/)"
                  value={values.price}
                  placeholder={picker.selectedVariant?.price || "0.00"}
                  onChange={(value) => setFieldValue("price", value)}
                  fieldType="price"
                  isAutoCalculateTarget={isFieldAutoCalculated("price")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("price")
                  }
                  decimals={2}
                  helperText={
                    picker.selectedVariant?.price
                      ? `Precio base: S/ ${picker.selectedVariant.price}`
                      : undefined
                  }
                  helperValue={picker.selectedVariant?.price}
                  onApplyHelperValue={(value) =>
                    setFieldValue("price", value)
                  }
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("total", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("total")
                  }
                  decimals={2}
                />
              </div>
            )}

            {/* Calculation Summary */}
            {calculation.isValid && (
              <div className="space-y-2 rounded-[20px] border border-orange-500/20 bg-orange-500/10 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cantidad:</span>
                  <span className="font-medium text-foreground">
                    {isKgProduct
                      ? `${formatKilos(calculation.quantity)} kg`
                      : `${Math.round(calculation.quantity)} unidades`}
                  </span>
                </div>
                <BusinessMode flag="useNetWeight">
                  {isKgProduct && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Precio unitario:
                      </span>
                      <span className="font-medium text-foreground">
                        S/ {formatCurrency(calculation.unitPrice)}
                      </span>
                    </div>
                  )}
                </BusinessMode>
                <div className="flex justify-between border-t border-orange-500/20 pt-2">
                  <span className="font-medium text-foreground">Subtotal:</span>
                  <span className="text-lg font-bold text-orange-500 dark:text-orange-300">
                    S/ {formatCurrency(calculation.subtotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
