import superjson from "superjson";
import { nanoid } from "nanoid";
import { createPresignedUpload } from "../../helpers/objectStorage";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./presign_POST.schema";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return new Response(superjson.stringify({ error: "Create your business page before uploading images." }), { status: 401 });
  }

  try {
    const input = schema.parse(superjson.parse(await request.text()));
    if (input.kind === "video" && !subscriptionPlan.resolve(business).canUseAdvancedMedia) {
      return new Response(superjson.stringify({ error: "Video uploads are available on Premium Plus only." }), { status: 402 });
    }

    const key = `businesses/${business.id}/${input.kind}/${nanoid(16)}.${EXTENSIONS[input.contentType]}`;
    const result = await createPresignedUpload({
      key,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });

    return new Response(superjson.stringify(result satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof Error ? error.message : "Could not prepare the upload.",
    }), { status: 400 });
  }
}
