/**
 * Database Schema Index
 * Exporta todas las tablas, relaciones y tipos
 */

// Better Auth (authentication)
export {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
  type User,
  type NewUser,
  type Session,
  type NewSession,
  type Account,
  type NewAccount,
  type Verification,
  type NewVerification,
} from "./auth";

// Enums
export {
  userRoleEnum,
  businessUserRoleEnum,
  syncStatusEnum,
  saleTypeEnum,
  orderStatusEnum,
  paymentMethodEnum,
  productTypeEnum,
  productUnitEnum,
  distribucionStatusEnum,
  modoOperacionEnum,
  supplierTypeEnum,
  purchaseStatusEnum,
} from "./enums";

// User Profiles (extiende Better Auth)
export {
  userProfiles,
  userProfilesRelations,
  type UserProfile,
  type NewUserProfile,
} from "./user-profiles";

// Assets (galería compartida)
export {
  assets,
  assetsRelations,
  type Asset,
  type NewAsset,
} from "./assets";

// Files (archivos privados)
export {
  files,
  filesRelations,
  type FileRecord,
  type NewFileRecord,
} from "./files";

// Businesses
export {
  businesses,
  businessUsers,
  businessesRelations,
  businessUsersRelations,
  type Business,
  type NewBusiness,
  type BusinessUser,
  type NewBusinessUser,
} from "./businesses";

// Customers
export {
  customers,
  customersRelations,
  type Customer,
  type NewCustomer,
} from "./customers";

// Sales
export {
  sales,
  saleItems,
  salesRelations,
  saleItemsRelations,
  type Sale,
  type NewSale,
  type SaleItem,
  type NewSaleItem,
} from "./sales";

export {
  orders,
  orderItems,
  ordersRelations,
  orderItemsRelations,
  type Order,
  type NewOrder,
  type OrderItem,
  type NewOrderItem,
} from "./orders";

export {
  orderEvents,
  orderEventTypeEnum,
  orderEventsRelations,
  type OrderEvent,
  type NewOrderEvent,
} from "./order-events";

// Payments (Abonos)
export {
  abonos,
  abonosRelations,
  type Abono,
  type NewAbono,
} from "./payments";

// Closings (Cierres del día)
export {
  closings,
  closingsRelations,
  type Closing,
  type NewClosing,
} from "./closings";

// Inventory (Products, Inventory, Distribuciones, Variants)
export {
  products,
  inventory,
  distribuciones,
  distribucionItems,
  productVariants,
  variantInventory,
  productsRelations,
  inventoryRelations,
  distribucionesRelations,
  distribucionItemsRelations,
  productVariantsRelations,
  variantInventoryRelations,
  type Product,
  type NewProduct,
  type Inventory,
  type NewInventory,
  type Distribucion,
  type NewDistribucion,
  type DistribucionItem,
  type NewDistribucionItem,
  type ProductVariant,
  type NewProductVariant,
  type VariantInventory,
  type NewVariantInventory,
} from "./inventory";

// Product Units
export {
  productUnits,
  productUnitsRelations,
  type ProductUnit,
  type NewProductUnit,
} from "./product-units";

// System Config
export {
  systemConfig,
  type SystemConfig,
  type NewSystemConfig,
} from "./config";

export {
  staffInvitations,
  invitationStatusEnum,
  staffInvitationsRelations,
  type StaffInvitation,
  type NewStaffInvitation,
} from "./staff-invitations";

export {
  syncOperations,
  syncOperationsRelations,
  type SyncOperation,
  type NewSyncOperation,
} from "./sync-operations";

export {
  suppliers,
  suppliersRelations,
  type Supplier,
  type NewSupplier,
} from "./suppliers";

export {
  purchases,
  purchaseItems,
  purchasesRelations,
  purchaseItemsRelations,
  type Purchase,
  type NewPurchase,
  type PurchaseItem,
  type NewPurchaseItem,
} from "./purchases";

export {
  businessPaymentSettings,
  businessPaymentSettingsRelations,
  type BusinessPaymentSettings,
  type NewBusinessPaymentSettings,
  type PaymentMethodConfig,
} from "./business-payment-settings";
