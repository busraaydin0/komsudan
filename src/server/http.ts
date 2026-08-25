import { ApiError } from "./rules";

export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export function fail(e: unknown) {
  if (e instanceof ApiError) {
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: { code: "INTERNAL", message: "Sunucu hatası." } }, { status: 500 });
}
