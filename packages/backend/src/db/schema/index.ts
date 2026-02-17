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
  paymentMethodEnum,
  productTypeEnum,
  productUnitEnum,
  distribucionStatusEnum,
  modoOperacionEnum,
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
  productVariants,
  variantInventory,
  productsRelations,
  inventoryRelations,
  distribucionesRelations,
  productVariantsRelations,
  variantInventoryRelations,
  type Product,
  type NewProduct,
  type Inventory,
  type NewInventory,
  type Distribucion,
  type NewDistribucion,
  type ProductVariant,
  type NewProductVariant,
  type VariantInventory,
  type NewVariantInventory,
} from "./inventory";

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
