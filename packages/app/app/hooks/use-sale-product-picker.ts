import { useMemo } from "react";
import { useProducts, type Product } from "./use-products";
import { useProductCategories } from "./use-product-categories";
import {
  useVariantsByProduct,
  type ProductVariant,
} from "./use-product-variants";
import type { SaleItem } from "./use-sales";

interface UseSaleProductPickerParams {
  saleItems: SaleItem[];
  selectedProductId: string | null;
  selectedVariantId: string | null;
  search: string;
  filter: string;
  onSelectProduct: (productId: string | null) => void;
  onSelectVariant: (variantId: string | null) => void;
}

export function useSaleProductPicker({
  saleItems,
  selectedProductId,
  selectedVariantId,
  search,
  filter,
  onSelectProduct,
  onSelectVariant,
}: UseSaleProductPickerParams) {
  const { data: products = [], isLoading, isFetching } = useProducts();
  const { data: categories = [] } = useProductCategories();

  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products],
  );

  const showProductDiscovery = activeProducts.length > 8;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        filter === "all" ||
        product.unit === filter ||
        (filter === "uncategorized"
          ? product.categoryId === null
          : product.categoryId === filter);

      return matchesSearch && matchesFilter;
    });
  }, [activeProducts, filter, search]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const {
    data: variants = [],
    isLoading: isVariantsLoading,
    isFetching: isVariantsFetching,
  } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  const cartProductIds = useMemo(
    () => new Set(saleItems.map((item) => item.productId)),
    [saleItems],
  );

  const isProductInCart = (productId: string) => cartProductIds.has(productId);

  const selectProduct = (productId: string | null) => {
    onSelectProduct(productId);
    onSelectVariant(null);
  };

  const selectVariant = (variantId: string | null) => {
    onSelectVariant(variantId);
  };

  return {
    products,
    activeProducts,
    categories,
    filteredProducts,
    showProductDiscovery,
    selectedProduct,
    selectedVariant,
    variants,
    isLoading,
    isFetching,
    isVariantsLoading,
    isVariantsFetching,
    isProductInCart,
    selectProduct,
    selectVariant,
  } as const;
}
