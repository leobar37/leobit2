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
import { SupplierRepository } from "../services/repository/supplier.repository";
import { SupplierService } from "../services/business/supplier.service";
import { PurchaseRepository } from "../services/repository/purchase.repository";
import { PurchaseService } from "../services/business/purchase.service";

export const servicesPlugin = new Elysia({ name: "services" })
  .as("global")
  .decorate(() => {
    const businessRepo = new BusinessRepository();
    const customerRepo = new CustomerRepository();
    const productRepo = new ProductRepository();
    const paymentRepo = new PaymentRepository();
    const inventoryRepo = new InventoryRepository();
    const distribucionRepo = new DistribucionRepository();
    const saleRepo = new SaleRepository();
    const closingRepo = new ClosingRepository();
    const assetRepo = new AssetRepository();
    const fileRepo = new FileRepository();
    const productVariantRepo = new ProductVariantRepository();
    const supplierRepo = new SupplierRepository();
    const purchaseRepo = new PurchaseRepository();

    const businessService = new BusinessService(businessRepo, supplierRepo);
    const customerService = new CustomerService(customerRepo);
    const productService = new ProductService(productRepo);
    const paymentService = new PaymentService(paymentRepo);
    const inventoryService = new InventoryService(inventoryRepo);
    const distribucionService = new DistribucionService(distribucionRepo);
    const saleService = new SaleService(saleRepo, paymentRepo);
    const closingService = new ClosingService(closingRepo);
    const syncService = new SyncService({
      customerRepo,
      saleRepo,
      paymentRepo,
      distribucionRepo,
    });
    const assetService = new AssetService(assetRepo);
    const fileService = new FileService(fileRepo);
    const productVariantService = new ProductVariantService(productVariantRepo);
    const supplierService = new SupplierService(supplierRepo);
    const purchaseService = new PurchaseService(purchaseRepo, inventoryRepo, supplierRepo);

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
      supplierRepo,
      supplierService,
      purchaseRepo,
      purchaseService,
    };
  });
