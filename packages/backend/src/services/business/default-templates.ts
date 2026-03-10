import type { WhatsAppTemplateRepository } from "../repository/whatsapp-template.repository";
import type { RequestContext } from "../../context/request-context";

/**
 * Default WhatsApp templates for new businesses
 */
export interface DefaultTemplate {
  name: string;
  content: string;
  isDefault: boolean;
  category: "cobranza" | "ventas" | "agradecimiento" | "entrega" | "otros";
}

/**
 * Default templates that will be created for each new business
 */
export const DEFAULT_WHATSAPP_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Recordatorio de Pago",
    content: `¡Hola {nombre_cliente}!

Te recordamos que tienes un saldo pendiente de {monto}.

Por favor realiza el pago a la brevedad. Si ya pagaste, ignora este mensaje.

Gracias.`,
    isDefault: true,
    category: "cobranza",
  },
  {
    name: "Agradecimiento por Compra",
    content: `¡Gracias por tu compra, {nombre_cliente}! 🎉

Productos: {productos}
Total: {total}

Esperamos que disfrutes nuestros productos. ¡Hasta pronto!`,
    isDefault: false,
    category: "agradecimiento",
  },
  {
    name: "Confirmación de Pedido",
    content: `¡Hola {nombre_cliente}!

Tu pedido ha sido registrado exitosamente.

📦 Productos: {productos}
💰 Total: {total}

Te contactaremos pronto para confirmar la entrega.

Gracias por tu preferencia.`,
    isDefault: false,
    category: "ventas",
  },
  {
    name: "Notificación de Entrega",
    content: `¡Hola {nombre_cliente}!

Tu pedido ha sido entregado exitosamente.

📝 Productos entregados: {productos}
💵 Monto: {monto}

¡Gracias por confiar en nosotros!`,
    isDefault: false,
    category: "entrega",
  },
];
