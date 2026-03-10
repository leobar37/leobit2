import type { WhatsAppTemplateRepository } from "../repository/whatsapp-template.repository";
import type { RequestContext } from "../../context/request-context";
import { DEFAULT_WHATSAPP_TEMPLATES } from "./default-templates";

/**
 * Service to seed default WhatsApp templates for new businesses
 */
export class TemplateSeedService {
  constructor(private templateRepo: WhatsAppTemplateRepository) {}

  /**
   * Seeds default WhatsApp templates for a business if they don't exist yet
   */
  async seedDefaultTemplates(ctx: RequestContext): Promise<void> {
    const existing = await this.templateRepo.findMany(ctx, { limit: 1 });
    
    if (existing.length > 0) {
      return;
    }

    for (const template of DEFAULT_WHATSAPP_TEMPLATES) {
      await this.templateRepo.create(ctx, {
        name: template.name,
        content: template.content,
        isDefault: template.isDefault,
      });
    }
  }

  /**
   * Check if a business has any templates
   */
  async hasTemplates(ctx: RequestContext): Promise<boolean> {
    const existing = await this.templateRepo.findMany(ctx, { limit: 1 });
    return existing.length > 0;
  }
}
