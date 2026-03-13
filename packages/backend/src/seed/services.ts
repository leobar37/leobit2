import { BusinessRepository } from "../services/repository/business.repository";
import { ProductRepository } from "../services/repository/product.repository";
import { ProductVariantRepository } from "../services/repository/product-variant.repository";
import { ProductUnitRepository } from "../services/repository/product-unit.repository";
import { WhatsAppTemplateRepository } from "../services/repository/whatsapp-template.repository";
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
import { TagRepository } from "../services/repository/tag.repository";
import { CustomerTagRepository } from "../services/repository/customer-tag.repository";
import { FileRepository } from "../services/repository/file.repository";
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
import { TagService } from "../services/business/tag.service";
import { CustomerTagService } from "../services/business/customer-tag.service";

export const repositories = {
  business: new BusinessRepository(),
  product: new ProductRepository(),
  productVariant: new ProductVariantRepository(),
  productUnit: new ProductUnitRepository(),
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
  tag: new TagRepository(),
  customerTag: new CustomerTagRepository(),
  whatsAppTemplate: new WhatsAppTemplateRepository(),
  file: new FileRepository(),
};

export const services = {
  business: new BusinessService(repositories.business, repositories.supplier, repositories.whatsAppTemplate),
  product: new ProductService(repositories.product, repositories.productVariant),
  productVariant: new ProductVariantService(repositories.productVariant),
  customer: new CustomerService(repositories.customer),
  sale: new SaleService(
    repositories.sale,
    repositories.payment,
    repositories.distribucion,
    repositories.distribucionItem,
    repositories.business
  ),
  payment: new PaymentService(repositories.payment, repositories.customer),
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
    repositories.productVariant,
    repositories.productUnit,
    repositories.file
  ),
  paymentMethodConfig: new PaymentMethodConfigService(repositories.paymentMethodConfig),
  tag: new TagService(repositories.tag),
  customerTag: new CustomerTagService(repositories.customerTag, repositories.tag, repositories.customer),
};

export type Services = typeof services;
