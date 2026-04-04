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
  jwks,
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
  type Jwks,
  type NewJwks,
} from "./auth";

// Enums
export {
  userRoleEnum,
  businessUserRoleEnum,
  syncStatusEnum,
  saleTypeEnum,
  transactionTypeEnum,
  paymentModeEnum,
  saleStatusEnum,
  orderStatusEnum,
  paymentMethodEnum,
  productTypeEnum,
  productUnitEnum,
  distribucionStatusEnum,
  supplierTypeEnum,
  purchaseStatusEnum,
  orderPaymentStatusEnum,
  visitaStatusEnum,
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

// Tags
export {
  tags,
  tagsRelations,
  type Tag,
  type NewTag,
} from "./tags";

// Customer Tags
export {
  customerTags,
  customerTagsRelations,
  type CustomerTag,
  type NewCustomerTag,
} from "./customer-tags";

// Customer Groups
export {
  customerGroups,
  customerGroupsRelations,
  type CustomerGroup,
  type NewCustomerGroup,
} from "./customer-groups";

// Customer Group Members
export {
  customerGroupMembers,
  customerGroupMembersRelations,
  type CustomerGroupMember,
  type NewCustomerGroupMember,
} from "./customer-group-members";

// Sales (Unified for instant_sales and pre_orders)
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

// Sale Tokens (for sharing sales with customers)
export {
  saleTokens,
  saleTokensRelations,
  type SaleToken,
  type NewSaleToken,
} from "./sale-tokens";

// Payments (Abonos)
export {
  abonos,
  abonosRelations,
  type Abono,
  type NewAbono,
} from "./payments";



// Inventory (Products, Inventory, Distribuciones, Variants)
export {
  products,
  distribuciones,
  distribucionItems,
  productVariants,
  variantInventory,
  productsRelations,
  distribucionesRelations,
  distribucionItemsRelations,
  productVariantsRelations,
  variantInventoryRelations,
  type Product,
  type NewProduct,
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
  syncConflicts,
  syncConflictsRelations,
  type SyncConflict,
  type NewSyncConflict,
} from "./sync-conflicts";

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

export {
  businessUserWhatsAppSettings,
  businessUserWhatsAppSettingsRelations,
  type BusinessUserWhatsAppSettings,
  type NewBusinessUserWhatsAppSettings,
} from "./business-user-whatsapp-settings";

export {
  whatsAppTemplates,
  whatsAppTemplatesRelations,
  type WhatsAppTemplate,
  type NewWhatsAppTemplate,
} from "./whatsapp-templates";

export {
  whatsAppMessages,
  whatsAppMessagesRelations,
  messageStatusEnum,
  type WhatsAppMessage,
  type NewWhatsAppMessage,
} from "./whatsapp-messages";

// Visitas (visits linked to distributions)
export {
  visitas,
  visitasRelations,
  type Visita,
  type NewVisita,
} from "./visitas";

// Puntos de Venta
export {
  puntosVenta,
  puntosVentaRelations,
  type PuntoVenta,
  type NewPuntoVenta,
  puntoVentaTypes,
  type PuntoVentaType,
} from "./puntos-venta";
