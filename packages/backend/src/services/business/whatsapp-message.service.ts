// @ts-nocheck - Backend file
import type { WhatsAppMessageRepository, MessageFilters } from "../repository/whatsapp-message.repository";
import type { WhatsAppTemplateRepository } from "../repository/whatsapp-template.repository";
import type { CustomerRepository } from "../repository/customer.repository";
import type { WhatsAppSettingsRepository } from "../repository/whatsapp-settings.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ServiceUnavailableError,
} from "../../errors";
import { inngest } from "../../lib/inngest";
import type { WhatsAppMessage, WhatsAppTemplate, NewWhatsAppMessage } from "../../db/schema";

const ALLOWED_VARIABLES = [
  "nombre_cliente",
  "monto",
  "fecha",
  "telefono",
  "productos",
  "total",
  "dias_sin_pedido",
  "ultima_entrega",
  "bidones_habituales",
] as const;

type AllowedVariable = (typeof ALLOWED_VARIABLES)[number];

interface TemplateVariables {
  nombre_cliente?: string;
  monto?: string | number;
  fecha?: string;
  telefono?: string;
  productos?: string;
  total?: string | number;
  dias_sin_pedido?: string | number;
  ultima_entrega?: string;
  bidones_habituales?: string | number;
}

interface SendMessageInput {
  customerId: string;
  templateId: string;
  variables?: TemplateVariables;
  saleId?: string;
}

interface SendBulkInput {
  customerIds: string[];
  templateId: string;
  variables?: Record<string, TemplateVariables>;
}

export class WhatsAppMessageService {
  constructor(
    private messageRepo: WhatsAppMessageRepository,
    private templateRepo: WhatsAppTemplateRepository,
    private customerRepo: CustomerRepository,
    private settingsRepo: WhatsAppSettingsRepository
  ) {}

  async sendMessage(
    ctx: RequestContext,
    input: SendMessageInput
  ): Promise<WhatsAppMessage> {
    if (!ctx.hasPermission("whatsapp.write")) {
      throw new ForbiddenError("No tiene permisos para enviar mensajes de WhatsApp");
    }

    const settings = await this.settingsRepo.findByBusinessUserId(ctx);
    if (!settings || !settings.isConnected || !settings.instanceName) {
      throw new ServiceUnavailableError(
        "WhatsApp no está conectado. Por favor conecte WhatsApp primero."
      );
    }

    const template = await this.templateRepo.findById(ctx, input.templateId);
    if (!template) {
      throw new NotFoundError("Plantilla de WhatsApp");
    }

    const customer = await this.customerRepo.findById(ctx, input.customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    const phoneNumber = this.formatPhoneNumber(customer.phone);
    if (!phoneNumber) {
      throw new ValidationError(
        `El cliente ${customer.name} no tiene un número de teléfono válido`
      );
    }

    const variables: TemplateVariables = {
      nombre_cliente: customer.name,
      telefono: customer.phone || "",
      ...input.variables,
    };

    const messageContent = this.renderTemplate(template, variables);

    const message = await this.messageRepo.create(ctx, {
      customerId: input.customerId,
      templateId: input.templateId,
      saleId: input.saleId || null,
      phoneNumber,
      messageContent,
      status: "enviado",
    });

    await inngest.send({
      name: "whatsapp/message.send",
      data: {
        instanceName: settings.instanceName,
        phone: phoneNumber,
        message: messageContent,
        businessUserId: ctx.businessUserId,
        businessId: ctx.businessId,
        messageLogId: message.id,
      },
    });

    return message;
  }

  async sendBulkMessages(
    ctx: RequestContext,
    input: SendBulkInput
  ): Promise<WhatsAppMessage[]> {
    if (!ctx.hasPermission("whatsapp.write")) {
      throw new ForbiddenError("No tiene permisos para enviar mensajes de WhatsApp");
    }

    const settings = await this.settingsRepo.findByBusinessUserId(ctx);
    if (!settings || !settings.isConnected || !settings.instanceName) {
      throw new ServiceUnavailableError(
        "WhatsApp no está conectado. Por favor conecte WhatsApp primero."
      );
    }

    const template = await this.templateRepo.findById(ctx, input.templateId);
    if (!template) {
      throw new NotFoundError("Plantilla de WhatsApp");
    }

    // Fetch all customers in parallel
    const customerResults = await Promise.all(
      input.customerIds.map(async (customerId) => {
        try {
          const customer = await this.customerRepo.findById(ctx, customerId);
          return { customerId, customer, error: null };
        } catch (error) {
          return { customerId, customer: null, error };
        }
      })
    );

    // Filter valid customers and prepare message data
    const validMessages: Omit<NewWhatsAppMessage, "businessId" | "businessUserId" | "id" | "createdAt">[] = [];
    const inngestTasks: Array<{ phone: string; messageContent: string; messageLogId: string }> = [];

    for (const result of customerResults) {
      if (!result.customer) {
        console.warn(`Customer ${result.customerId} not found, skipping...`);
        continue;
      }

      const phoneNumber = this.formatPhoneNumber(result.customer.phone);
      if (!phoneNumber) {
        console.warn(`Customer ${result.customer.name} has no valid phone, skipping...`);
        continue;
      }

      const variables: TemplateVariables = {
        nombre_cliente: result.customer.name,
        telefono: result.customer.phone || "",
        ...input.variables?.[result.customerId],
      };

      const messageContent = this.renderTemplate(template, variables);

      validMessages.push({
        customerId: result.customerId,
        templateId: input.templateId,
        phoneNumber,
        messageContent,
        status: "enviado",
        saleId: null,
      });
    }

    // Batch insert all messages at once
    if (validMessages.length > 0) {
      const createdMessages = await this.messageRepo.createMany(ctx, validMessages);

      // Send all inngest events in parallel
      await Promise.all(
        createdMessages.map((message) =>
          inngest.send({
            name: "whatsapp/message.send",
            data: {
              instanceName: settings.instanceName,
              phone: message.phoneNumber,
              message: message.messageContent,
              businessUserId: ctx.businessUserId,
              businessId: ctx.businessId,
              messageLogId: message.id,
            },
          })
        )
      );

      return createdMessages;
    }

    return [];
  }

  async getMessages(
    ctx: RequestContext,
    filters?: MessageFilters
  ): Promise<{ messages: WhatsAppMessage[]; total: number }> {
    if (!ctx.hasPermission("whatsapp.read")) {
      throw new ForbiddenError("No tiene permisos para ver mensajes de WhatsApp");
    }

    const [messages, total] = await Promise.all([
      this.messageRepo.findMany(ctx, filters),
      this.messageRepo.count(ctx, filters),
    ]);

    return { messages, total };
  }

  async retryMessage(ctx: RequestContext, messageId: string): Promise<WhatsAppMessage> {
    if (!ctx.hasPermission("whatsapp.write")) {
      throw new ForbiddenError("No tiene permisos para reenviar mensajes de WhatsApp");
    }

    const settings = await this.settingsRepo.findByBusinessUserId(ctx);
    if (!settings || !settings.isConnected || !settings.instanceName) {
      throw new ServiceUnavailableError(
        "WhatsApp no está conectado. Por favor conecte WhatsApp primero."
      );
    }

    const message = await this.messageRepo.findById(ctx, messageId);
    if (!message) {
      throw new NotFoundError("Mensaje de WhatsApp");
    }

    if (message.status !== "fallido") {
      throw new ValidationError(
        "Solo se pueden reintentar mensajes fallidos"
      );
    }

    const updated = await this.messageRepo.updateStatus(
      ctx,
      messageId,
      "enviado",
      undefined
    );

    if (!updated) {
      throw new NotFoundError("Mensaje de WhatsApp");
    }

    await inngest.send({
      name: "whatsapp/message.send",
      data: {
        instanceName: settings.instanceName,
        phone: message.phoneNumber,
        message: message.messageContent,
        businessUserId: ctx.businessUserId,
        businessId: ctx.businessId,
        messageLogId: message.id,
      },
    });

    return updated;
  }

  async getStats(ctx: RequestContext): Promise<{
    total: number;
    sent: number;
    failed: number;
  }> {
    if (!ctx.hasPermission("whatsapp.read")) {
      throw new ForbiddenError("No tiene permisos para ver estadísticas de WhatsApp");
    }

    return this.messageRepo.getStats(ctx);
  }

  private formatPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;

    let cleaned = phone.replace(/[\s\-\(\)]/g, "");

    if (cleaned.startsWith("51") && !cleaned.startsWith("+51")) {
      cleaned = `+${cleaned}`;
    } else if (!cleaned.startsWith("+")) {
      cleaned = `+51${cleaned}`;
    }

    const peruPhoneRegex = /^\+51\d{9}$/;
    if (!peruPhoneRegex.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  private renderTemplate(
    template: WhatsAppTemplate,
    variables: TemplateVariables
  ): string {
    let rendered = template.content;

    for (const key of ALLOWED_VARIABLES) {
      const placeholder = `{${key}}`;
      const value = variables[key];

      if (value !== undefined) {
        rendered = rendered.replaceAll(placeholder, String(value));
      }
    }

    return rendered;
  }
}
