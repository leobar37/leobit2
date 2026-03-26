import { Elysia } from "elysia";
import { BusinessRepository } from "../services/repository/business.repository";
import { BusinessService } from "../services/business/business.service";
import { CustomerRepository } from "../services/repository/customer.repository";
import { CustomerService } from "../services/business/customer.service";
import { ProductRepository } from "../services/repository/product.repository";
import { ProductService } from "../services/business/product.service";
import { PaymentRepository } from "../services/repository/payment.repository";
import { PaymentService } from "../services/business/payment.service";
import { DistribucionRepository } from "../services/repository/distribucion.repository";
import { DistribucionItemRepository } from "../services/repository/distribucion-item.repository";
import { DistribucionService } from "../services/business/distribucion.service";
import { SaleRepository } from "../services/repository/sale.repository";
import { SaleService } from "../services/business/sale.service";
import { SyncService } from "../services/sync/sync.service";
import { AssetRepository } from "../services/repository/asset.repository";
import { AssetService } from "../services/business/asset.service";
import { FileRepository } from "../services/repository/file.repository";
import { FileService } from "../services/business/file.service";
import { ProductVariantRepository } from "../services/repository/product-variant.repository";
import { ProductVariantService } from "../services/business/product-variant.service";
import { ProductUnitRepository } from "../services/repository/product-unit.repository";
import { ProductUnitService } from "../services/business/product-unit.service";
import { SupplierRepository } from "../services/repository/supplier.repository";
import { SupplierService } from "../services/business/supplier.service";
import { PurchaseRepository } from "../services/repository/purchase.repository";
import { PurchaseService } from "../services/business/purchase.service";
import { StaffInvitationRepository } from "../services/repository/staff-invitation.repository";
import { StaffInvitationService } from "../services/business/staff-invitation.service";
import { SaleTokenRepository } from "../services/repository/sale-token.repository";
import { SaleTokenService } from "../services/business/sale-token.service";

import { PaymentMethodConfigRepository } from "../services/repository/payment-method-config.repository";
import { PaymentMethodConfigService } from "../services/business/payment-method-config.service";
import { OCRService } from "../services/business/ocr.service";
import { WhatsAppTemplateRepository } from "../services/repository/whatsapp-template.repository";
import { WhatsAppTemplateService } from "../services/business/whatsapp-template.service";
import { WhatsAppSettingsRepository } from "../services/repository/whatsapp-settings.repository";
import { WhatsAppSettingsService } from "../services/business/whatsapp-settings.service";
import { WhatsAppMessageRepository } from "../services/repository/whatsapp-message.repository";
import { WhatsAppMessageService } from "../services/business/whatsapp-message.service";
import { TemplateSeedService } from "../services/business/template-seed.service";
import { TagRepository } from "../services/repository/tag.repository";
import { TagService } from "../services/business/tag.service";
import { CustomerTagRepository } from "../services/repository/customer-tag.repository";
import { CustomerTagService } from "../services/business/customer-tag.service";
import { PuntoVentaRepository } from "../services/repository/punto-venta.repository";
import { CustomerGroupRepository } from "../services/repository/customer-group.repository";
import { CustomerGroupService } from "../services/business/customer-group.service";
import { VisitaRepository } from "../services/repository/visita.repository";
import { VisitaService } from "../services/business/visita.service";
import { initializeStateMachines } from "../services/transitions";

export const servicesPlugin = new Elysia({ name: "services" })
  .as("global")
  .decorate(() => {
    const businessRepo = new BusinessRepository();
    const customerRepo = new CustomerRepository();
    const productRepo = new ProductRepository();
    const paymentRepo = new PaymentRepository();
    const distribucionRepo = new DistribucionRepository();
    const distribucionItemRepo = new DistribucionItemRepository();
    const saleRepo = new SaleRepository();
    const assetRepo = new AssetRepository();
    const fileRepo = new FileRepository();
    const productVariantRepo = new ProductVariantRepository();
    const productUnitRepo = new ProductUnitRepository();
    const supplierRepo = new SupplierRepository();
    const purchaseRepo = new PurchaseRepository();
    const staffInvitationRepo = new StaffInvitationRepository();
    const saleTokenRepo = new SaleTokenRepository();
    const paymentMethodConfigRepo = new PaymentMethodConfigRepository();
    const whatsAppTemplateRepo = new WhatsAppTemplateRepository();
    const whatsAppSettingsRepo = new WhatsAppSettingsRepository();
    const whatsAppMessageRepo = new WhatsAppMessageRepository();
    const tagRepo = new TagRepository();
    const customerTagRepo = new CustomerTagRepository();
    const customerGroupRepo = new CustomerGroupRepository();
    const visitaRepo = new VisitaRepository();

    // Initialize state machines with their transitions
    initializeStateMachines({ 
      variantRepo: productVariantRepo,
      saleDeps: {
        paymentRepository: paymentRepo,
        distribucionItemRepository: distribucionItemRepo,
        saleRepository: saleRepo,
      }
    });

    const businessService = new BusinessService(businessRepo, supplierRepo, whatsAppTemplateRepo);
    const customerService = new CustomerService(customerRepo);
    const productService = new ProductService(productRepo, productVariantRepo);
    const paymentService = new PaymentService(paymentRepo, customerRepo);
    const distribucionService = new DistribucionService(distribucionRepo, distribucionItemRepo, productVariantRepo, customerGroupRepo, visitaRepo);
    const saleService = new SaleService(saleRepo, paymentRepo, distribucionRepo, distribucionItemRepo, businessRepo, visitaRepo);
    const syncService = new SyncService({
      customerRepo,
      saleRepo,
      paymentRepo,
      distribucionRepo,
      distribucionService,
      productRepo,
      tagRepo,
      customerTagRepo,
      purchaseRepo,
      variantRepo: productVariantRepo,
      customerGroupRepo,
      visitaRepo,
      supplierRepo,
    });
    const assetService = new AssetService(assetRepo);
    const fileService = new FileService(fileRepo);
    const productVariantService = new ProductVariantService(productVariantRepo);
    const productUnitService = new ProductUnitService(productUnitRepo);
    const supplierService = new SupplierService(supplierRepo);
    const purchaseService = new PurchaseService(purchaseRepo, supplierRepo, productVariantRepo, productUnitRepo, fileRepo);
    const staffInvitationService = new StaffInvitationService(staffInvitationRepo, businessRepo);
    const saleTokenService = new SaleTokenService(saleTokenRepo, saleRepo);
    const paymentMethodConfigService = new PaymentMethodConfigService(paymentMethodConfigRepo);
    const ocrService = new OCRService();
    const whatsAppTemplateService = new WhatsAppTemplateService(whatsAppTemplateRepo);
    const whatsAppSettingsService = new WhatsAppSettingsService(whatsAppSettingsRepo);
    const whatsAppMessageService = new WhatsAppMessageService(
      whatsAppMessageRepo,
      whatsAppTemplateRepo,
      customerRepo,
      whatsAppSettingsRepo
    );
    const templateSeedService = new TemplateSeedService(whatsAppTemplateRepo);
    const tagService = new TagService(tagRepo);
    const customerTagService = new CustomerTagService(customerTagRepo, tagRepo, customerRepo);
    const customerGroupService = new CustomerGroupService(customerGroupRepo, customerRepo);
    const visitaService = new VisitaService(visitaRepo, customerRepo, distribucionRepo);
    const puntoVentaRepo = new PuntoVentaRepository();

    return {
      businessRepo,
      businessService,
      customerRepo,
      customerService,
      productRepo,
      productService,
      paymentRepo,
      paymentService,
      distribucionRepo,
      distribucionItemRepo,
      distribucionService,
      saleRepo,
      saleService,
      syncService,
      assetRepo,
      assetService,
      fileRepo,
      fileService,
      productVariantRepo,
      productVariantService,
      productUnitRepo,
      productUnitService,
      supplierRepo,
      supplierService,
      purchaseRepo,
      purchaseService,
      staffInvitationRepo,
      staffInvitationService,
      saleTokenRepo,
      saleTokenService,
      paymentMethodConfigRepo,
      paymentMethodConfigService,
      ocrService,
      whatsAppTemplateRepo,
      whatsAppTemplateService,
      whatsAppSettingsRepo,
      whatsAppSettingsService,
      whatsAppMessageRepo,
      whatsAppMessageService,
      templateSeedService,
      tagRepo,
      tagService,
      customerTagRepo,
      customerTagService,
      customerGroupRepo,
      customerGroupService,
      visitaRepo,
      visitaService,
      puntoVentaRepo,
    };
  });
