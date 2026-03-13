/**
 * Products Hook - Barrel export
 * All product hooks are now service-based (offline-first)
 */
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from "./use-products";
