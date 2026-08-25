import { fail, ok } from "@/server/http";
import { parseBody, refreshSchema } from "@/lib/validation/auth.schema";
import { rotateRefresh } from "@/lib/services/authService";
import { readRefreshToken } from "@/lib/auth/middleware";
import { setAuthCookies } from "@/lib/auth/cookies";
import { publicUser } from "@/lib/auth/types";
import { ApiError } from "@/server/rules";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, refreshSchema);
    const token = body.refreshToken || (await readRefreshToken(req));
    if (!token) throw new ApiError(401, "Refresh token gerekli.", "INVALID_REFRESH");
    const tokens = await rotateRefresh(token);
    await setAuthCookies(tokens);
    return ok({
      user: publicUser(tokens.user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresIn: tokens.accessExpiresIn,
    });
  } catch (e) {
    return fail(e);
  }
}
