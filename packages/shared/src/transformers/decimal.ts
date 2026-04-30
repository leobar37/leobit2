/**
 * Transformadores de decimales
 * Nivel 2 de abstracción: Convierte entre string decimal y number
 * Usa los estándares definidos en standards/decimals
 */

/**
 * Convierte un valor decimal del backend a number
 * Maneja: string, number, null, undefined
 * 
 * @example
 * decimalToNumber("12.500") // 12.5
 * decimalToNumber(null)     // 0
 * decimalToNumber("")       // 0
 */
export function decimalToNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return 0;
  }
  
  return parsed;
}

/**
 * Crea un transformador que convierte number a string con N decimales
 * 
 * @param decimals Cantidad de decimales
 * @returns Función que formatea un valor a string
 * 
 * @example
 * const toCurrency = decimalToString(2);
 * toCurrency(12.5)    // "12.50"
 * toCurrency(null)    // ""
 * 
 * const toWeight = decimalToString(3);
 * toWeight(12.5)      // "12.500"
 */
export function decimalToString(decimals: number) {
  return (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    
    const num = typeof value === "string" ? parseFloat(value) : value;
    
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return "";
    }
    
    return num.toFixed(decimals);
  };
}

/**
 * Convierte un objeto con campos decimales a strings formateados
 * Útil para casos puntuales donde no se necesita un transformer completo
 * 
 * @param obj Objeto con campos decimales
 * @param fields Lista de campos a convertir
 * @param decimals Cantidad de decimales por campo
 * @returns Objeto con los campos convertidos a string
 * 
 * @example
 * const item = { quantity: "12.5", unitPrice: "15" };
 * normalizeToStrings(item, ["quantity", "unitPrice"], { quantity: 3, unitPrice: 2 });
 * // { quantity: "12.500", unitPrice: "15.00" }
 */
export function normalizeToStrings<T extends object>(
  obj: T,
  fields: (keyof T)[],
  decimals: Record<string, number>
): Partial<Record<keyof T, string>> {
  const result: Partial<Record<keyof T, string>> = {};
  
  for (const field of fields) {
    const key = String(field);
    if (key in decimals) {
      const transform = decimalToString(decimals[key]);
      result[field] = transform(obj[field] as any);
    }
  }
  
  return result;
}

/**
 * Convierte un objeto con campos decimales a numbers
 * Útil para casos puntuales donde no se necesita un transformer completo
 * 
 * @param obj Objeto con campos decimales
 * @param fields Lista de campos a convertir
 * @returns Objeto con los campos convertidos a number
 * 
 * @example
 * const item = { quantity: "12.5", unitPrice: "15" };
 * normalizeToNumbers(item, ["quantity", "unitPrice"]);
 * // { quantity: 12.5, unitPrice: 15 }
 */
export function normalizeToNumbers<T extends object>(
  obj: T,
  fields: (keyof T)[]
): Partial<Record<keyof T, number>> {
  const result: Partial<Record<keyof T, number>> = {};
  
  for (const field of fields) {
    result[field] = decimalToNumber(obj[field] as any);
  }
  
  return result;
}
