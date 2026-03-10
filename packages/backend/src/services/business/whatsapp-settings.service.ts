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
  qrCode?: string | null;
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
      const instanceExists = await this.evolutionService.instanceExists(instanceName);
      
      if (!instanceExists) {
        await this.evolutionService.createInstance(instanceName);
      }

      const { qrCode } = await this.evolutionService.connectInstance(
        instanceName
      );

      await this.repository.update(ctx, settings.id, {
        instanceName,
        isConnected: false,
        qrCode,
        qrCodeExpiresAt: new Date(Date.now() + 60000), // 60 seconds
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

    // If connected, just return status
    if (settings.isConnected && settings.instanceName) {
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
          qrCode: null,
        };
      } catch (error) {
        console.error("Failed to get WhatsApp status:", error);
        return {
          isConnected: false,
          state: "unknown",
          phoneNumber: settings.phoneNumber,
          instanceName: settings.instanceName,
          qrCode: null,
        };
      }
    }

    // If we have a valid stored QR, return it
    if (
      settings.qrCode &&
      settings.qrCodeExpiresAt &&
      settings.qrCodeExpiresAt > new Date()
    ) {
      return {
        isConnected: false,
        state: "connecting",
        phoneNumber: settings.phoneNumber,
        instanceName: settings.instanceName,
        qrCode: settings.qrCode,
      };
    }

    // If we have instance name but no valid QR, try to generate one
    if (settings.instanceName) {
      try {
        const { qrCode } = await this.evolutionService.connectInstance(
          settings.instanceName
        );

        await this.repository.update(ctx, settings.id, {
          qrCode,
          qrCodeExpiresAt: new Date(Date.now() + 60000), // 60 seconds
        });

        return {
          isConnected: false,
          state: "connecting",
          phoneNumber: settings.phoneNumber,
          instanceName: settings.instanceName,
          qrCode,
        };
      } catch (error) {
        console.error("Failed to generate QR code:", error);
        // Continue to return status without QR
      }
    }

    // Not connected, no instance
    return {
      isConnected: false,
      state: "close",
      phoneNumber: settings.phoneNumber,
      instanceName: settings.instanceName,
      qrCode: null,
    };
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
