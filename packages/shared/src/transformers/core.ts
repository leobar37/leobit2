/**
 * Core de transformación genérico
 * Nivel 1 de abstracción: No sabe de decimales ni entidades
 * Solo aplica callbacks por campo
 */

export interface FieldTransform {
  toForm?: (value: any) => any;
  toApi?: (value: any) => any;
}

export type TransformConfig<T> = {
  [K in keyof T]?: FieldTransform;
};

export interface Transformer<T> {
  /** Transforma backend → UI (strings para formularios). Acepta cualquier objeto con los campos a transformar. */
  toForm: (obj: any) => Partial<Record<keyof T, any>>;
  /** Transforma UI → backend (numbers para API). Acepta cualquier objeto con los campos a transformar. */
  toApi: (obj: any) => Partial<Record<keyof T, any>>;
  /** Convierte todos los campos configurados a number. Acepta cualquier objeto con los campos a transformar. */
  toNumbers: (obj: any) => Partial<Record<keyof T, number>>;
}

/**
 * Crea un transformador para una entidad
 * @param config Configuración de transformación por campo
 * @returns Transformer con métodos toForm, toApi, toNumbers
 * 
 * @example
 * const saleItemTransformer = createTransformer<SaleItem>({
 *   quantity: { toForm: decimalToString(3), toApi: decimalToNumber },
 *   unitPrice: { toForm: decimalToString(2), toApi: decimalToNumber },
 * });
 * 
 * const uiItem = saleItemTransformer.toForm(backendItem);
 * const apiPayload = saleItemTransformer.toApi(formValues);
 */
export function createTransformer<T extends object>(
  config: TransformConfig<T>
): Transformer<T> {
  const fields = Object.entries(config) as [keyof T, FieldTransform][];

  return {
    toForm: (obj: any) => {
      const result: Partial<Record<keyof T, any>> = {};
      
      for (const [key, transform] of fields) {
        if (transform.toForm && key in obj) {
          const value = obj[key];
          if (value !== undefined && value !== null) {
            result[key] = transform.toForm(value);
          }
        }
      }
      
      return result;
    },

    toApi: (obj: any) => {
      const result: Partial<Record<keyof T, any>> = {};
      
      for (const [key, transform] of fields) {
        if (transform.toApi && key in obj && obj[key] !== undefined) {
          result[key] = transform.toApi(obj[key]);
        }
      }
      
      return result;
    },

    toNumbers: (obj: any) => {
      const result: Partial<Record<keyof T, number>> = {};
      
      for (const [key, transform] of fields) {
        if (transform.toApi && key in obj) {
          const value = obj[key];
          if (value !== undefined && value !== null) {
            result[key] = transform.toApi(value);
          }
        }
      }
      
      return result;
    },
  };
}
