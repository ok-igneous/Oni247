import { postPresignUpload, ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES } from "../endpoints/uploads/presign_POST.schema";
import superjson from "superjson";
import { postRegisterMedia } from "../endpoints/media/register_POST.schema";

export const uploadVideo = async (file: File): Promise<string> => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) throw new Error("Use an MP4 or WebM video.");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Video must be 50 MB or smaller.");
  const { presignedUrl, url } = await postPresignUpload({ kind: "video", contentType: file.type as (typeof ALLOWED_VIDEO_TYPES)[number], sizeBytes: file.size });
  const response = await fetch(presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!response.ok) throw new Error("The video upload failed. Check your connection and try again.");
  await postRegisterMedia({kind:"video",fileUrl:url,contentType:file.type,sizeBytes:file.size});
  return url;
};
