import { useEffect, useMemo, type ReactNode } from "react";
import { Provider, createStore, useAtomValue, useSetAtom } from "jotai";
import {
  getPersistedCalculatorSelection,
  type CalculatorPersistence,
} from "~/hooks/use-chicken-calculator";
import { useProducts } from "~/hooks/use-products-live";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import {
  persistedSelectionAtom,
  selectedProductAtom,
  selectedVariantAtom,
} from "~/atoms/new-sale";

function NewSaleInitializer() {
  const selectedProduct = useAtomValue(selectedProductAtom);
  const selectedVariant = useAtomValue(selectedVariantAtom);
  const persistedSelection = useAtomValue(persistedSelectionAtom);
  const setPersistedSelection = useSetAtom(persistedSelectionAtom);
  const setSelectedProduct = useSetAtom(selectedProductAtom);
  const setSelectedVariant = useSetAtom(selectedVariantAtom);

  const { data: products } = useProducts();
  const restoreProductId = selectedProduct?.id || persistedSelection?.lastProductId || "";
  const { data: restoreVariants } = useVariantsByProduct(restoreProductId, { isActive: true });

  useEffect(() => {
    setPersistedSelection(getPersistedCalculatorSelection());
  }, [setPersistedSelection]);

  useEffect(() => {
    if (selectedProduct || !persistedSelection?.lastProductId || !products?.length) {
      return;
    }

    const persistedProduct = products.find(
      (product) => product.id === persistedSelection.lastProductId && product.isActive,
    );

    if (persistedProduct) {
      setSelectedProduct(persistedProduct);
    }
  }, [products, persistedSelection, selectedProduct, setSelectedProduct]);

  useEffect(() => {
    if (!selectedProduct || selectedVariant || !restoreVariants?.length) {
      return;
    }

    const activeVariants = restoreVariants.filter((variant) => variant.isActive);
    if (activeVariants.length === 0) {
      return;
    }

    const preferredVariant =
      activeVariants.find((variant) => variant.id === persistedSelection?.lastVariantId) ||
      activeVariants[0];

    setSelectedVariant(preferredVariant);
  }, [persistedSelection?.lastVariantId, restoreVariants, selectedProduct, selectedVariant, setSelectedVariant]);

  return null;
}

export function NewSaleProvider({
  children,
  initialPersistedSelection,
}: {
  children: ReactNode;
  initialPersistedSelection?: CalculatorPersistence | null;
}) {
  const store = useMemo(() => createStore(), []);

  if (initialPersistedSelection) {
    store.set(persistedSelectionAtom, initialPersistedSelection);
  }

  return (
    <Provider store={store}>
      <NewSaleInitializer />
      {children}
    </Provider>
  );
}
