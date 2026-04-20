// @ts-nocheck - Backend file
import { EvolutionClient } from "@gymspace/evolution";
import { ServiceUnavailableError } from "../../errors";

export class EvolutionService {
  private client: EvolutionClient;
  private isConfigured: boolean;

  constructor() {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    this.isConfigured = !!(apiUrl && apiKey);

    if (!this.isConfigured) {
      console.error("[EvolutionService] EVOLUTION_API_URL and EVOLUTION_API_KEY must be set. WhatsApp features will be disabled.");
    }

    this.client = new EvolutionClient({
      serverUrl: apiUrl || "",
      token: apiKey || "",
    });
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableError(
        "WhatsApp service is not configured. Please set EVOLUTION_API_URL and EVOLUTION_API_KEY environment variables."
      );
    }
  }

  async instanceExists(instanceName: string): Promise<boolean> {
    this.ensureConfigured();
    try {
      const response = await this.client.instances.fetchAll();
      const instances = (response as any)?.instances || [];
      return instances.some((instance: any) => instance.instanceName === instanceName);
    } catch (error) {
      console.error("[EvolutionService] Failed to fetch instances:", error);
      return false;
    }
  }

  async createInstance(instanceName: string): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.instances.create({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        always_online: true,
      });
    } catch (error: any) {
      if (error?.statusCode === 409 || error?.statusCode === 403 || error?.message?.includes("already exists") || error?.message?.includes("is already in use")) {
        console.log(`[EvolutionService] Instance ${instanceName} already exists, skipping creation`);
        return;
      }
      console.error("[EvolutionService] Failed to create instance:", error);
      throw new ServiceUnavailableError("No se pudo crear la instancia de WhatsApp. Por favor intente nuevamente.");
    }
  }

  async connectInstance(instanceName: string): Promise<{ qrCode: string }> {
    this.ensureConfigured();
    try {
      const response = await this.client.instances.connect({ instanceName });
      return { qrCode: response.base64 };
    } catch (error) {
      console.error("[EvolutionService] Failed to connect instance:", error);
      throw new ServiceUnavailableError("No se pudo generar el código QR. Por favor intente nuevamente.");
    }
  }

  async getConnectionState(instanceName: string): Promise<"open" | "close" | "connecting"> {
    this.ensureConfigured();
    try {
      const response = await this.client.instances.connectionState({ instanceName });
      const state = (response as any)?.instance?.state as "open" | "close" | "connecting";
      return state || "close";
    } catch (error) {
      console.error("[EvolutionService] Failed to get connection state:", error);
      return "close";
    }
  }

  async sendText(instanceName: string, phone: string, text: string): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.messages.sendText(
        { number: phone, text },
        { instance: instanceName }
      );
    } catch (error: any) {
      console.error("[EvolutionService] Failed to send message:", error);

      if (error?.message?.includes("rate limit") || error?.statusCode === 429) {
        throw new ServiceUnavailableError("Límite de mensajes alcanzado. Por favor espere unos minutos.");
      }

      if (error?.message?.includes("not connected") || error?.statusCode === 401) {
        throw new ServiceUnavailableError("WhatsApp no está conectado. Por favor reconecte su WhatsApp.");
      }

      throw new ServiceUnavailableError("No se pudo enviar el mensaje. Por favor intente nuevamente.");
    }
  }

  async sendImage(
    instanceName: string,
    phone: string,
    imageUrl: string,
    caption?: string
  ): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.messages.sendImage(
        {
          number: phone,
          image: imageUrl,
          caption: caption,
        },
        { instance: instanceName }
      );
    } catch (error: any) {
      console.error("[EvolutionService] Failed to send image:", error);
      throw new ServiceUnavailableError("No se pudo enviar la imagen. Por favor intente nuevamente.");
    }
  }

  async sendVideo(
    instanceName: string,
    phone: string,
    videoUrl: string,
    caption?: string
  ): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.messages.sendVideo(
        {
          number: phone,
          video: videoUrl,
          caption: caption,
        },
        { instance: instanceName }
      );
    } catch (error: any) {
      console.error("[EvolutionService] Failed to send video:", error);
      throw new ServiceUnavailableError("No se pudo enviar el video. Por favor intente nuevamente.");
    }
  }

  async sendDocument(
    instanceName: string,
    phone: string,
    documentUrl: string,
    fileName?: string
  ): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.messages.sendDocument(
        {
          number: phone,
          document: documentUrl,
          fileName: fileName,
        },
        { instance: instanceName }
      );
    } catch (error: any) {
      console.error("[EvolutionService] Failed to send document:", error);
      throw new ServiceUnavailableError("No se pudo enviar el documento. Por favor intente nuevamente.");
    }
  }

  async logoutInstance(instanceName: string): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.instances.logout({ instanceName });
    } catch (error) {
      console.error("[EvolutionService] Failed to logout instance:", error);
      throw new ServiceUnavailableError("No se pudo desconectar WhatsApp. Por favor intente nuevamente.");
    }
  }
}

export const evolutionService = new EvolutionService();
