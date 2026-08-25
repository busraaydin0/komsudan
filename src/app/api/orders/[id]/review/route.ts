import { fail } from "@/server/http";
import { requireAccount } from "@/server/auth";
import { addReviewPhoto } from "@/server/photos";
import { createReview, reviewForOrder } from "@/server/reviews";
import { ApiError } from "@/server/rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const account = await requireAccount();
    const { id } = await ctx.params;
    const form = await req.formData();
    const rating = Number(form.get("rating"));
    const body = String(form.get("body") ?? "");
    const review = createReview(id, { rating, body }, account.name);
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
