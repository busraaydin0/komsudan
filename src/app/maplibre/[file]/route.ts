import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED = new Set(["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]);

type Ctx = { params: Promise<{ file: string }> };

/** MapLibre vector tiles parse in a module worker; Next's bundle URL doesn't resolve the sibling shared chunk. */
export async function GET(_req: Request, ctx: Ctx) {
  const { file } = await ctx.params;
  if (!ALLOWED.has(file)) return new Response("Not found", { status: 404 });
  const buf = await readFile(join(process.cwd(), "node_modules/maplibre-gl/dist", file));
  return new Response(buf, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
