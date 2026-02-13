/**
 * Database Schema Index
 * Exporta todas las tablas, relaciones y tipos
 */

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
  type UserProfile,
  type NewUserProfile,
} from "./user-profiles";

// Businesses
export {
  businesses,
  businessUsers,
  type Business,
  type NewBusiness,
  type BusinessUser,
  type NewBusinessUser,
} from "./businesses";

// Customers
export {
  customers,
  type Customer,
  type NewCustomer,
} from "./customers";

// Sales
export {
  sales,
  saleItems,
  type Sale,
  type NewSale,
  type SaleItem,
  type NewSaleItem,
} from "./sales";

// Payments (Abonos)
export {
  abonos,
  type Abono,
  type NewAbono,
} from "./payments";

// Closings (Cierres del día)
export {
  closings,
  type Closing,
  type NewClosing,
} from "./closings";

// Inventory (Products, Inventory, Distribuciones)
export {
  products,
  inventory,
  distribuciones,
  type Product,
  type NewProduct,
  type Inventory,
  type NewInventory,
  type Distribucion,
  type NewDistribucion,
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
  type StaffInvitation,
  type NewStaffInvitation,
} from "./staff-invitations";

import "./relations";
