import { BusinessRepository } from "../services/repository/business.repository";
import { ProductRepository } from "../services/repository/product.repository";
import { ProductVariantRepository } from "../services/repository/product-variant.repository";
import { CustomerRepository } from "../services/repository/customer.repository";
import { SaleRepository } from "../services/repository/sale.repository";
import { PaymentRepository } from "../services/repository/payment.repository";
import { DistribucionRepository } from "../services/repository/distribucion.repository";
import { DistribucionItemRepository } from "../services/repository/distribucion-item.repository";
import { InventoryRepository } from "../services/repository/inventory.repository";
import { ClosingRepository } from "../services/repository/closing.repository";
import { SupplierRepository } from "../services/repository/supplier.repository";
import { PurchaseRepository } from "../services/repository/purchase.repository";
import { PaymentMethodConfigRepository } from "../services/repository/payment-method-config.repository";

import { BusinessService } from "../services/business/business.service";
import { ProductService } from "../services/business/product.service";
import { ProductVariantService } from "../services/business/product-variant.service";
import { CustomerService } from "../services/business/customer.service";
import { SaleService } from "../services/business/sale.service";
import { PaymentService } from "../services/business/payment.service";
import { DistribucionService } from "../services/business/distribucion.service";
import { InventoryService } from "../services/business/inventory.service";
import { ClosingService } from "../services/business/closing.service";
import { SupplierService } from "../services/business/supplier.service";
import { PurchaseService } from "../services/business/purchase.service";
import { PaymentMethodConfigService } from "../services/business/payment-method-config.service";

export const repositories = {
  business: new BusinessRepository(),
  product: new ProductRepository(),
  productVariant: new ProductVariantRepository(),
  customer: new CustomerRepository(),
  sale: new SaleRepository(),
  payment: new PaymentRepository(),
  distribucion: new DistribucionRepository(),
  distribucionItem: new DistribucionItemRepository(),
  inventory: new InventoryRepository(),
  closing: new ClosingRepository(),
  supplier: new SupplierRepository(),
  purchase: new PurchaseRepository(),
  paymentMethodConfig: new PaymentMethodConfigRepository(),
};

export const services = {
  business: new BusinessService(repositories.business, repositories.supplier),
  product: new ProductService(repositories.product),
  productVariant: new ProductVariantService(repositories.productVariant),
  customer: new CustomerService(repositories.customer),
  sale: new SaleService(
    repositories.sale,
    repositories.payment,
    repositories.distribucion,
    repositories.distribucionItem,
    repositories.business
  ),
  payment: new PaymentService(repositories.payment),
  distribucion: new DistribucionService(
    repositories.distribucion,
    repositories.distribucionItem,
    repositories.productVariant
  ),
  inventory: new InventoryService(repositories.inventory),
  closing: new ClosingService(repositories.closing),
  supplier: new SupplierService(repositories.supplier),
  purchase: new PurchaseService(
    repositories.purchase,
    repositories.inventory,
    repositories.supplier,
    repositories.productVariant
  ),
  paymentMethodConfig: new PaymentMethodConfigService(repositories.paymentMethodConfig),
};

export type Services = typeof services;
