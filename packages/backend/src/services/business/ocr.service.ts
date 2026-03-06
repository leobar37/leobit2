import { generateText } from "ai";
import { moonshotai } from "@ai-sdk/moonshotai";

export interface OCRResult {
  bruto: string | null;
  tara: string | null;
  precioPorKg: string | null;
  precioTotal: string | null;
  confianza: number;
  notas: string | null;
}

interface OCROptions {
  autoFillPrice: boolean;
  autoFillTara: boolean;
}

export class OCRService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MOONSHOT_API_KEY || "";
    if (!this.apiKey) {
      console.warn("MOONSHOT_API_KEY no configurada - OCR no funcionará");
    }
  }

  /**
   * Reconoce peso de balanza digital desde imagen base64
   */
  async recognizeWeight(
    imageBase64: string,
    options: OCROptions
  ): Promise<OCRResult> {
    if (!this.apiKey) {
      throw new Error("MOONSHOT_API_KEY no configurada");
    }

    const prompt = this.buildPrompt(options);

    const { text } = await generateText({
      model: moonshotai("kimi-vl"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: imageBase64 }
          ]
        }
      ],
      maxTokens: 500,
    });

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se pudo interpretar la respuesta de la imagen");
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      return {
        bruto: result.bruto || null,
        tara: result.tara || null,
        precioPorKg: result.precioPorKg || null,
        precioTotal: result.precioTotal || null,
        confianza: result.confianza || 0,
        notas: result.notas || null,
      };
    } catch {
      throw new Error("Error al parsear respuesta OCR");
    }
  }

  /**
   * Construye el prompt según configuración del negocio
   */
  private buildPrompt(options: OCROptions): string {
    const instructions = [
      "Eres un experto reconociendo dígitos de balanzas digitales de peso.",
      "La imagen muestra una balanza digital de una tienda de venta de pollos/carnes en Perú.",
      "El display de la balanza puede mostrar:",
      "1. PESO BRUTO: El número principal en kg (formato: X.XXX, ej: 12.500)"
    ];

    if (options.autoFillTara) {
      instructions.push("2. TARA: El valor de tara en kg si está indicado");
    }

    if (options.autoFillPrice) {
      instructions.push("3. PRECIO POR KG: El precio por kilogramo (formato: S/ X.XX o X,X)");
      instructions.push("4. PRECIO TOTAL: El total a pagar (formato: S/ XX.XX)");
    }

    return instructions.join(". ") + `

Responde SOLO con JSON válido, sin texto adicional:
{
  "bruto": "12.500" | null,
  "tara": "1.200" | null,
  "precioPorKg": "8.50" | null,
  "precioTotal": "96.05" | null,
  "confianza": 0.0-1.0,
  "notas": "observaciones si hay algo inusual" | null
}

Usa null si no puedes determinar un valor.
confianza es tu nivel de certeza del 0 al 1.
Siéntete libre de indicar null si no estás seguro.`;
  }
}
