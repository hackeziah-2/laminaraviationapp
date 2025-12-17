export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function snakeAllKeys<T>(data: T): any {
  if (Array.isArray(data)) {
    return data.map((item) => snakeAllKeys(item));
  }

  if (data !== null && typeof data === "object") {
    const result: Record<string, any> = {};

    Object.entries(data as Record<string, any>).forEach(([key, value]) => {
      const newKey = camelToSnake(key);
      result[newKey] = snakeAllKeys(value);
    });

    return result;
  }

  return data;
}

export function toCamel<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const key in obj) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = obj[key];
  }
  return result;
}

export const dateToday = new Date().toISOString().split("T")[0];
