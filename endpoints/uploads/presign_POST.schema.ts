import { z } from "zod";
import superjson from "superjson";

export const ALLOWED_IMAGE_TYPES = ["image/png","image/jpeg","image/webp"] as const;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export const schema = z.object({
  kind: z.enum(["logo","product","gallery","background"]),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
   10	  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
   11	});
   12	export type InputType = z.infer<typeof schema>;
   13	export type OutputType = { presignedUrl: string; url: string };
   14	
   15	export const postPresignUpload = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
   16	  const validatedInput = schema.parse(body);
   17	  const result = await fetch("/_api/uploads/presign", {
   18	    method: "POST", body: superjson.stringify(validatedInput), ...init,
   19	    headers: {"Content-Type":"application/json", ...(init?.headers ?? {})},
   20	  });
   21	  if (!result.ok) {
   22	    const errorObject = superjson.parse<{error:string}>(await result.text());
   23	    throw new Error(errorObject.error);
   24	  }
   25	  return superjson.parse<OutputType>(await result.text());
   26	};
