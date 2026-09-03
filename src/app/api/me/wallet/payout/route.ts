import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { walletPayoutSchema } from "@/lib/validation/wallet.schema";
import { listWalletActivity, withdrawWallet } from "@/lib/services/walletService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await parseBody(req, walletPayoutSchema);
    const wallet = withdrawWallet(user.id, body.method, body.amount);
    return ok({ wallet, activity: listWalletActivity(user.id) });
  } catch (e) {
    return fail(e);
  }
}
