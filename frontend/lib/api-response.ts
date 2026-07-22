export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function responseData(response: unknown): unknown {
  return isRecord(response) ? response.data : undefined;
}

export function responseRecord(response: unknown): Record<string, unknown> {
  const data = responseData(response);
  return isRecord(data) ? data : {};
}

export function responseArray<T>(response: unknown, ...keys: string[]): T[] {
  const data = responseData(response);
  let candidate: unknown = data;

  if (isRecord(data)) {
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        candidate = data[key];
        break;
      }
    }
  }

  return Array.isArray(candidate) ? candidate as T[] : [];
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
