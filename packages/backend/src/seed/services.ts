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
import { SupplierRepository } from "../services/repository/supplier.repository";
import { PurchaseRepository } from "../services/repository/purchase.repository";
import { PaymentMethodConfigRepository } from "../services/repository/payment-method-config.repository";
import { TagRepository } from "../services/repository/tag.repository";
import { CustomerTagRepository } from "../services/repository/customer-tag.repository";
import { FileRepository } from "../services/repository/file.repository";
import { VisitaRepository } from "../services/repository/visita.repository";
import { CustomerGroupRepository } from "../services/repository/customer-group.repository";
import { CategoryRepository } from "../services/repository/category.repository";
import { BusinessService } from "../services/business/business.service";
import { ProductService } from "../services/business/product.service";
import { ProductVariantService } from "../services/business/product-variant.service";
import { CustomerService } from "../services/business/customer.service";
import { SaleService } from "../services/business/sale.service";
import { PaymentService } from "../services/business/payment.service";
import { DistribucionService } from "../services/business/distribucion.service";
import { SupplierService } from "../services/business/supplier.service";
import { PurchaseService } from "../services/business/purchase.service";
import { PaymentMethodConfigService } from "../services/business/payment-method-config.service";
import { TagService } from "../services/business/tag.service";
import { CategoryService } from "../services/business/category.service";
import { CustomerTagService } from "../services/business/customer-tag.service";
import type { RequestContext } from "../context/request-context";

/**
 * Seed default product categories and return a name->id mapping.
 * Skips creation if categories already exist for the business.
 */
export async function seedDefaultCategories(
  ctx: RequestContext,
  categoriesData: Array<{ name: string; color: string }>
): Promise<Map<string, string>> {
  const existing = await services.category.listCategories(ctx);
  if (existing.length > 0) {
    return new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));
  }

  const map = new Map<string, string>();
  for (const cat of categoriesData) {
    const result = await services.category.createCategory(ctx, cat);
    map.set(cat.name.toLowerCase(), result.data.id);
  }
  return map;
}

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
  supplier: new SupplierRepository(),
  purchase: new PurchaseRepository(),
  paymentMethodConfig: new PaymentMethodConfigRepository(),
  tag: new TagRepository(),
  customerTag: new CustomerTagRepository(),
  whatsAppTemplate: new WhatsAppTemplateRepository(),
  file: new FileRepository(),
  visita: new VisitaRepository(),
  customerGroup: new CustomerGroupRepository(),
  category: new CategoryRepository(),
};

export const services = {
  business: new BusinessService(repositories.business, repositories.supplier, repositories.whatsAppTemplate),
  product: new ProductService(repositories.product, repositories.productVariant, repositories.category),
  productVariant: new ProductVariantService(repositories.productVariant),
  customer: new CustomerService(repositories.customer),
  sale: new SaleService(
    repositories.sale,
    repositories.payment,
    repositories.distribucion,
    repositories.distribucionItem,
    repositories.business,
    repositories.visita
  ),
  payment: new PaymentService(repositories.payment, repositories.customer),
  distribucion: new DistribucionService(
    repositories.distribucion,
    repositories.distribucionItem,
    repositories.productVariant,
    repositories.customerGroup,
    repositories.visita
  ),
  supplier: new SupplierService(repositories.supplier),
  purchase: new PurchaseService(
    repositories.purchase,
    repositories.supplier,
    repositories.productVariant,
    repositories.productUnit,
    repositories.file
  ),
  paymentMethodConfig: new PaymentMethodConfigService(repositories.paymentMethodConfig),
  tag: new TagService(repositories.tag),
  category: new CategoryService(repositories.category),
  customerTag: new CustomerTagService(repositories.customerTag, repositories.tag, repositories.customer),
};

export type Services = typeof services;
