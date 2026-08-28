import { fail, ok } from "@/server/http";
import { ApiError } from "@/server/rules";
import { parseBody } from "@/lib/validation/parse";
import { paymentWebhookSchema } from "@/lib/validation/payment.schema";
import { receiveWebhook } from "@/lib/services/paymentService";

export const dynamic = "force-dynamic";

function webhookSecret() {
  return process.env.PAYMENTS_WEBHOOK_SECRET ?? process.env.IYZICO_WEBHOOK_SECRET ?? "";
}

export async function POST(req: Request) {
  try {
    const secret = webhookSecret();
    if (!secret) {
      throw new ApiError(501, "iyzico henüz bağlı değil.", "IYZICO_NOT_CONFIGURED");
    }
    const given = req.headers.get("x-callback-secret") ?? "";
    if (given !== secret) {
      throw new ApiError(401, "Webhook imzası uyuşmadı.", "UNAUTHORIZED");
    }
    const body = await parseBody(req, paymentWebhookSchema);
    return ok(receiveWebhook(body));
  } catch (e) {
    return fail(e);
  }
}
