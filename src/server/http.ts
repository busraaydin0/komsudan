import { ApiError } from "./rules";

export function fail(e: unknown) {
  if (e instanceof ApiError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: "Sunucu hatası." }, { status: 500 });
}
