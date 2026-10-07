/** Tarayıcı fetch: API hata zarfını Error mesajına çevirir. */

export function errorMessageFromBody(data: { error?: unknown }) {
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error === "object" && "message" in data.error) {
    const message = (data.error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "İstek başarısız.";
}

export async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: unknown };
  if (!res.ok) throw new Error(errorMessageFromBody(data));
  return data;
}

export function unwrapEnvelope<T>(data: { data?: T } & Partial<T>): T {
  return (data.data ?? data) as T;
}
