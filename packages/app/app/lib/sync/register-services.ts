import type { SyncClientEngineLike } from "../services/base-service";
import { CustomerService } from "../services/customer-service";
import { SaleService } from "../services/sale-service";
import { PaymentService } from "../services/payment-service";
import { PurchaseService } from "../services/purchase-service";
import { ProductService } from "../services/product-service";
import { InventoryService } from "../services/inventory-service";
import { TagService } from "../services/tag-service";
import { CustomerTagService } from "../services/customer-tag-service";
import { VisitaService } from "../services/visita-service";
import { CustomerGroupService } from "../services/customer-group-service";
import { DistribucionService } from "../services/distribucion-service";
import { SupplierService } from "../services/supplier-service";

export function registerAppServices(engine: SyncClientEngineLike): void {
  engine.use("customers", () => new CustomerService(engine));
  engine.use("sales", () => new SaleService(engine));
  engine.use("payments", () => new PaymentService(engine));
  engine.use("purchases", () => new PurchaseService(engine));
  engine.use("products", () => new ProductService(engine));
  engine.use("inventory", () => new InventoryService(engine));
  engine.use("tags", () => new TagService(engine));
  engine.use("customerTags", () => new CustomerTagService(engine));
  engine.use("visitas", () => new VisitaService(engine));
  engine.use("customerGroups", () => new CustomerGroupService(engine));
  engine.use("distribuciones", () => new DistribucionService(engine));
  engine.use("suppliers", () => new SupplierService(engine));
}
