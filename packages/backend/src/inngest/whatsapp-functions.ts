import { inngest } from "../lib/inngest";
import { evolutionService } from "../services/infrastructure/evolution.service";
import { WhatsAppMessageRepository } from "../services/repository/whatsapp-message.repository";
import { RequestContext } from "../context/request-context";

const messageRepo = new WhatsAppMessageRepository();

export interface SendWhatsAppMessageEvent {
  name: "whatsapp/message.send";
  data: {
    instanceName: string;
    phone: string;
    message: string;
    businessUserId: string;
    messageLogId: string;
    businessId: string;
  };
}

export const sendWhatsAppMessage = inngest.createFunction(
  { id: "send-whatsapp-message", retries: 3 },
  { event: "whatsapp/message.send" },
  async ({ event, step }) => {
    const { instanceName, phone, message, businessUserId, messageLogId, businessId } = event.data;

    await step.sleep("3s");

    try {
      await step.run("send-to-whatsapp", async () => {
        await evolutionService.sendText(instanceName, phone, message);
      });

      await step.run("update-log-success", async () => {
        const ctx = RequestContext.forWorker(businessId, businessUserId);
        await messageRepo.updateStatus(ctx, messageLogId, "enviado");
      });
    } catch (error) {
      await step.run("update-log-error", async () => {
        const ctx = RequestContext.forWorker(businessId, businessUserId);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await messageRepo.updateStatus(ctx, messageLogId, "fallido", errorMessage);
      });
      throw error;
    }
  }
);

export const whatsAppFunctions = [sendWhatsAppMessage];
