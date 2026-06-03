export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function transformKeysToCamel<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = isObject(value) ? transformKeysToCamel(value as Record<string, unknown>) : value;
  }
  return result as T;
}

export function transformKeysToSnake(obj: Record<string, unknown>, skipId = true): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' && skipId) continue;
    if (value === undefined) continue;
    const snakeKey = camelToSnake(key);
    if (isObject(value)) {
      result[snakeKey] = transformKeysToSnake(value as Record<string, unknown>, false);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        isObject(item) ? transformKeysToSnake(item as Record<string, unknown>, false) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

export function transformArrayToCamel<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => transformKeysToCamel<T>(item));
}

export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}
