import { BusinessRepository } from "../services/repository/business.repository";
import { ProductRepository } from "../services/repository/product.repository";
import { CustomerRepository } from "../services/repository/customer.repository";
import { SaleRepository } from "../services/repository/sale.repository";
import { PaymentRepository } from "../services/repository/payment.repository";
import { DistribucionRepository } from "../services/repository/distribucion.repository";
import { InventoryRepository } from "../services/repository/inventory.repository";
import { ClosingRepository } from "../services/repository/closing.repository";

import { BusinessService } from "../services/business/business.service";
import { ProductService } from "../services/business/product.service";
import { CustomerService } from "../services/business/customer.service";
import { SaleService } from "../services/business/sale.service";
import { PaymentService } from "../services/business/payment.service";
import { DistribucionService } from "../services/business/distribucion.service";
import { InventoryService } from "../services/business/inventory.service";
import { ClosingService } from "../services/business/closing.service";

export const repositories = {
  business: new BusinessRepository(),
  product: new ProductRepository(),
  customer: new CustomerRepository(),
  sale: new SaleRepository(),
  payment: new PaymentRepository(),
  distribucion: new DistribucionRepository(),
  inventory: new InventoryRepository(),
  closing: new ClosingRepository(),
};

export const services = {
  business: new BusinessService(repositories.business),
  product: new ProductService(repositories.product),
  customer: new CustomerService(repositories.customer),
  sale: new SaleService(repositories.sale),
  payment: new PaymentService(repositories.payment),
  distribucion: new DistribucionService(repositories.distribucion),
  inventory: new InventoryService(repositories.inventory),
  closing: new ClosingService(repositories.closing),
};

export type Services = typeof services;
