import { z } from "zod";
import superjson from "superjson";

export const ALLOWED_IMAGE_TYPES = ["image/png","image/jpeg","image/webp"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4","video/webm"] as const;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const schema = z.object({
  kind: z.enum(["logo","product","gallery","background","video"]),
  contentType: z.enum([...ALLOWED_IMAGE_TYPES,...ALLOWED_VIDEO_TYPES]),
  sizeBytes: z.number().int().positive().max(MAX_VIDEO_BYTES),
}).superRefine((value,ctx)=>{
  if(value.kind==="video"&&!(ALLOWED_VIDEO_TYPES as readonly string[]).includes(value.contentType))ctx.addIssue({code:"custom",message:"Use an MP4 or WebM video.",path:["contentType"]});
  if(value.kind!=="video"&&!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(value.contentType))ctx.addIssue({code:"custom",message:"Use a PNG, JPG or WebP image.",path:["contentType"]});
  if(value.kind==="video"&&value.sizeBytes>MAX_VIDEO_BYTES)ctx.addIssue({code:"custom",message:"Video must be 50 MB or smaller.",path:["sizeBytes"]});
  if(value.kind!=="video"&&value.sizeBytes>MAX_IMAGE_BYTES)ctx.addIssue({code:"custom",message:"Image must be 3 MB or smaller.",path:["sizeBytes"]});
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { presignedUrl: string; url: string };

export const postPresignUpload = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch("/_api/uploads/presign", {
    method: "POST", body: superjson.stringify(validatedInput), ...init,
    headers: {"Content-Type":"application/json", ...(init?.headers ?? {})},
  });
  if (!result.ok) {
    const body = await result.text();
    let message: string | undefined;
    const readMessage = (value: unknown): string | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const record = value as Record<string, unknown>;
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
      return undefined;
    };
    try {
      message = readMessage(superjson.parse<unknown>(body));
    } catch {
      // Some infrastructure errors are plain JSON or text rather than SuperJSON.
    }
    if (!message) {
      try { message = readMessage(JSON.parse(body) as unknown); }
      catch { /* Use the status-based fallback for non-JSON error pages. */ }
    }
    throw new Error(message || `Request failed (HTTP ${result.status}). Please try again.`);
  }
  return superjson.parse<OutputType>(await result.text());
};
