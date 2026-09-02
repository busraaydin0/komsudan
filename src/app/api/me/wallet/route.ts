import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { walletTopupSchema } from "@/lib/validation/wallet.schema";
import { getWallet, listWalletActivity, topupWallet } from "@/lib/services/walletService";
import { TOPUP_PRESETS } from "@/lib/walletMethods";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const raw = url.searchParams.get("amount");
    const amount = raw && Number.isFinite(Number(raw)) ? Math.max(0, Math.round(Number(raw))) : 0;
    return ok({
      wallet: getWallet(user.id, amount),
      activity: listWalletActivity(user.id),
      presets: TOPUP_PRESETS,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await parseBody(req, walletTopupSchema);
    const wallet = topupWallet(user.id, body.method, body.amount);
    return ok({ wallet, activity: listWalletActivity(user.id) });
  } catch (e) {
    return fail(e);
  }
}
