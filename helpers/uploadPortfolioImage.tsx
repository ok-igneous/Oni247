import { postAdminPortfolioUpload } from "../endpoints/admin/portfolioUpload_POST.schema";

export const uploadPortfolioImage = async (file: File): Promise<string> => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Choose an image smaller than 3 MB.");
  const { presignedUrl, url } = await postAdminPortfolioUpload({ contentType: file.type as "image/png" | "image/jpeg" | "image/webp", sizeBytes: file.size, fileName: file.name });
  const response = await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!response.ok) throw new Error("The image upload did not complete. Please try again.");
  return url;
};
