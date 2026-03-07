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

  async createInstance(instanceName: string): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client.instances.create({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        rejectCall: true,
        alwaysOnline: true,
      });
    } catch (error) {
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
