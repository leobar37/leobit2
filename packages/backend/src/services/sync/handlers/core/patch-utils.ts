type GenericRecord = Record<string, unknown>;

export function pickDefinedFields<T extends GenericRecord, K extends keyof T>(
  source: T,
  fields: readonly K[]
): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};

  for (const field of fields) {
    const value = source[field];
    if (value !== undefined) {
      result[field] = value;
    }
  }

  return result;
}

export function mapDefinedFields(
  source: GenericRecord,
  mapping: Record<string, string>
): GenericRecord {
  const result: GenericRecord = {};

  for (const [sourceField, targetField] of Object.entries(mapping)) {
    const value = source[sourceField];
    if (value !== undefined) {
      result[targetField] = value;
    }
  }

  return result;
}

export function mergeDefined(
  base: GenericRecord,
  ...partials: GenericRecord[]
): GenericRecord {
  const merged: GenericRecord = { ...base };

  for (const partial of partials) {
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return merged;
}
