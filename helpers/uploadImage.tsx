import { postPresignUpload, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../endpoints/uploads/presign_POST.schema";

export const uploadImage = async (file: File, kind: "logo"|"product"|"gallery"|"background"): Promise<string> => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is over 3 MB. Please use a smaller one.");
  const {presignedUrl,url} = await postPresignUpload({kind,contentType:file.type as (typeof ALLOWED_IMAGE_TYPES)[number],sizeBytes:file.size});
  const put = await fetch(presignedUrl,{method:"PUT",body:file,headers:{"Content-Type":file.type}});
  if (!put.ok) throw new Error("The image failed to upload. Check your connection.");
  return url;
   10	};
