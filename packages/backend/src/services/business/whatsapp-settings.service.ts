import { WhatsAppSettingsRepository } from "../repository/whatsapp-settings.repository";
import { EvolutionService } from "../infrastructure/evolution.service";
import {
  NotFoundError,
  ValidationError,
  ServiceUnavailableError,
} from "../../errors";
import type { RequestContext } from "../../context/request-context";
import type { BusinessUserWhatsAppSettings } from "../../db/schema";

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  state: "open" | "close" | "connecting" | "unknown";
  phoneNumber: string | null;
  instanceName: string | null;
}

export interface WhatsAppConnectResult {
  qrCode: string;
  instanceName: string;
}

export class WhatsAppSettingsService {
  private evolutionService: EvolutionService;

  constructor(private repository: WhatsAppSettingsRepository) {
    this.evolutionService = new EvolutionService();
  }

  async getSettings(
    ctx: RequestContext
  ): Promise<BusinessUserWhatsAppSettings> {
    return this.repository.getOrCreate(ctx);
  }

  async connect(ctx: RequestContext): Promise<WhatsAppConnectResult> {
    const settings = await this.repository.getOrCreate(ctx);

    const instanceName =
      settings.instanceName ||
      `avileo-${ctx.businessId.slice(0, 8)}-${ctx.businessUserId.slice(0, 8)}`;

    try {
      await this.evolutionService.createInstance(instanceName);

      const { qrCode } = await this.evolutionService.connectInstance(
        instanceName
      );

      await this.repository.update(ctx, settings.id, {
        instanceName,
        isConnected: false,
      });

      return {
        qrCode,
        instanceName,
      };
    } catch (error) {
      console.error("Failed to connect to WhatsApp:", error);
      throw new ServiceUnavailableError(
        "No se pudo conectar con el servicio de WhatsApp"
      );
    }
  }

  async getStatus(ctx: RequestContext): Promise<WhatsAppConnectionStatus> {
    const settings = await this.repository.getOrCreate(ctx);

    if (!settings.instanceName || !settings.isConnected) {
      return {
        isConnected: false,
        state: "close",
        phoneNumber: settings.phoneNumber,
        instanceName: settings.instanceName,
      };
    }

    try {
      const state = await this.evolutionService.getConnectionState(
        settings.instanceName
      );

      const isActuallyConnected = state === "open";

      if (isActuallyConnected !== settings.isConnected) {
        await this.repository.updateConnection(ctx, settings.id, {
          isConnected: isActuallyConnected,
          phoneNumber: settings.phoneNumber,
          instanceName: settings.instanceName,
        });
      }

      return {
        isConnected: isActuallyConnected,
        state,
        phoneNumber: settings.phoneNumber,
        instanceName: settings.instanceName,
      };
    } catch (error) {
      console.error("Failed to get WhatsApp status:", error);
      return {
        isConnected: false,
        state: "unknown",
        phoneNumber: settings.phoneNumber,
        instanceName: settings.instanceName,
      };
    }
  }

  async disconnect(ctx: RequestContext): Promise<void> {
    const settings = await this.repository.findByBusinessUserId(ctx);

    if (!settings) {
      throw new NotFoundError("Configuración de WhatsApp");
    }

    if (!settings.instanceName) {
      throw new ValidationError("No hay una instancia de WhatsApp configurada");
    }

    try {
      await this.evolutionService.logoutInstance(settings.instanceName);

      await this.repository.updateConnection(ctx, settings.id, {
        isConnected: false,
        phoneNumber: null,
        instanceName: null,
      });
    } catch (error) {
      console.error("Failed to disconnect WhatsApp:", error);
      throw new ServiceUnavailableError(
        "No se pudo desconectar el servicio de WhatsApp"
      );
    }
  }

  async updateConnectionStatus(
    ctx: RequestContext,
    phoneNumber: string
  ): Promise<BusinessUserWhatsAppSettings> {
    const settings = await this.repository.findByBusinessUserId(ctx);

    if (!settings) {
      throw new NotFoundError("Configuración de WhatsApp");
    }

    return this.repository.updateConnection(ctx, settings.id, {
      isConnected: true,
      phoneNumber,
      instanceName: settings.instanceName,
    });
  }
}
