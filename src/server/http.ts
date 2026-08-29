import { ApiError } from "./rules";
import { logger } from "@/lib/logger";

export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export function fail(e: unknown) {
  if (e instanceof ApiError) {
    const payload = { err: e, code: e.code, status: e.status };
    if (e.status >= 500) logger.error(payload, e.message);
    else logger.warn(payload, e.message);
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  logger.error({ err: e }, "Sunucu hatası.");
  return Response.json({ error: { code: "INTERNAL", message: "Sunucu hatası." } }, { status: 500 });
}
