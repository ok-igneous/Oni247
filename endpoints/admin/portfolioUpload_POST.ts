import superjson from "superjson";
import { nanoid } from "nanoid";
import { upload } from "@floot/storage";
import { requireAdmin } from "../../helpers/requireAdmin";
import { schema, type OutputType } from "./portfolioUpload_POST.schema";

export async function handle(request: Request) {
  try { await requireAdmin(request); } catch { return new Response(superjson.stringify({ error: "Not allowed" }), { status: 403 }); }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const ext = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
    const result = await upload({ visibility: "public", filename: `portfolio/${nanoid(18)}.${ext}`, contentType: input.contentType, sizeBytes: input.sizeBytes });
    if (!result.ok) return new Response(superjson.stringify({ error: "Could not prepare this image upload." }), { status: 400 });
    return new Response(superjson.stringify({ presignedUrl: result.presignedUrl, url: result.url } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) { return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not prepare image upload." }), { status: 400 }); }
}
