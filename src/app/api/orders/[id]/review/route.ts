import { fail } from "@/server/http";
import { requireAccount } from "@/server/auth";
import { addReviewPhoto } from "@/server/photos";
import { createReview, reviewForOrder } from "@/lib/services/reviewService";
import { ApiError } from "@/server/rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function formNumber(form: FormData, key: string): number | undefined {
  const raw = form.get(key);
  if (raw == null || String(raw).trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function formRepeat(form: FormData): boolean | undefined {
  const raw = String(form.get("wouldRepeat") ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return undefined;
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const account = await requireAccount();
    const { id } = await ctx.params;
    const form = await req.formData();
    const rating = Number(form.get("rating"));
    const body = String(form.get("body") ?? "");
    const review = createReview(
      id,
      {
        rating,
        body,
        quality: formNumber(form, "quality"),
        timeliness: formNumber(form, "timeliness"),
        communication: formNumber(form, "communication"),
        wouldRepeat: formRepeat(form),
      },
      account.name,
    );
    const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    for (const file of files.slice(0, 4)) {
      await addReviewPhoto(review.id, Buffer.from(await file.arrayBuffer()));
    }
    return Response.json({ review: reviewForOrder(id) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireAccount();
    const { id } = await ctx.params;
    const review = reviewForOrder(id);
    if (!review) throw new ApiError(404, "Yorum yok.");
    return Response.json({ review });
  } catch (e) {
    return fail(e);
  }
}
