import { saleEvents } from "./events";

export interface OCRResult {
  bruto?: string;
  tara?: string;
  precioPorKg?: string;
}

export const emitOCRResult = (result: OCRResult) => {
  if (result.bruto) {
    saleEvents.emit("ocr:bruto", { value: result.bruto });
  }
  if (result.tara) {
    saleEvents.emit("ocr:tara", { value: result.tara });
  }
  if (result.precioPorKg) {
    saleEvents.emit("ocr:precio", { value: result.precioPorKg });
  }
};
