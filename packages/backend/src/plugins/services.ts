import { Elysia } from "elysia";
import { BusinessRepository } from "../services/repository/business.repository";
import { BusinessService } from "../services/business/business.service";
import { CustomerRepository } from "../services/repository/customer.repository";
import { CustomerService } from "../services/business/customer.service";
import { ProductRepository } from "../services/repository/product.repository";
import { ProductService } from "../services/business/product.service";
import { PaymentRepository } from "../services/repository/payment.repository";
import { PaymentService } from "../services/business/payment.service";
import { InventoryRepository } from "../services/repository/inventory.repository";
import { InventoryService } from "../services/business/inventory.service";
import { DistribucionRepository } from "../services/repository/distribucion.repository";
import { DistribucionService } from "../services/business/distribucion.service";
import { SaleRepository } from "../services/repository/sale.repository";
import { SaleService } from "../services/business/sale.service";
import { ClosingRepository } from "../services/repository/closing.repository";
import { ClosingService } from "../services/business/closing.service";
import { SyncService } from "../services/sync/sync.service";
import { AssetRepository } from "../services/repository/asset.repository";
import { AssetService } from "../services/business/asset.service";
import { FileRepository } from "../services/repository/file.repository";
import { FileService } from "../services/business/file.service";
import { ProductVariantRepository } from "../services/repository/product-variant.repository";
import { ProductVariantService } from "../services/business/product-variant.service";

export const servicesPlugin = new Elysia({ name: "services" })
  .as("global")
  .decorate(() => {
    const businessRepo = new BusinessRepository();
    const businessService = new BusinessService(businessRepo);
    const customerRepo = new CustomerRepository();
    const customerService = new CustomerService(customerRepo);
    const productRepo = new ProductRepository();
    const productService = new ProductService(productRepo);
    const paymentRepo = new PaymentRepository();
    const paymentService = new PaymentService(paymentRepo);
    const inventoryRepo = new InventoryRepository();
    const inventoryService = new InventoryService(inventoryRepo);
    const distribucionRepo = new DistribucionRepository();
    const distribucionService = new DistribucionService(distribucionRepo);
    const saleRepo = new SaleRepository();
    const saleService = new SaleService(saleRepo);
    const closingRepo = new ClosingRepository();
    const closingService = new ClosingService(closingRepo);
    const syncService = new SyncService({
      customerRepo,
      saleRepo,
      paymentRepo,
      distribucionRepo,
    });
    const assetRepo = new AssetRepository();
    const assetService = new AssetService(assetRepo);
    const fileRepo = new FileRepository();
    const fileService = new FileService(fileRepo);
    const productVariantRepo = new ProductVariantRepository();
    const productVariantService = new ProductVariantService(productVariantRepo);

    return {
      businessRepo,
      businessService,
      customerRepo,
      customerService,
      productRepo,
      productService,
      paymentRepo,
      paymentService,
      inventoryRepo,
      inventoryService,
      distribucionRepo,
      distribucionService,
      saleRepo,
      saleService,
      closingRepo,
      closingService,
      syncService,
      assetRepo,
      assetService,
      fileRepo,
      fileService,
      productVariantRepo,
      productVariantService,
    };
  });
