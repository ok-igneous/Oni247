import { postPresignUpload, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../endpoints/uploads/presign_POST.schema";
import { postRegisterMedia } from "../endpoints/media/register_POST.schema";
import { processImage } from "./processImage";
import { uploadStore } from "./uploadStore";
import { friendlyError } from "./friendlyError";

const activeRequests = new Map<string, XMLHttpRequest>();
const retryHandlers = new Map<string, () => void>();

export const cancelImageUpload = (id: string) => activeRequests.get(id)?.abort();
export const retryImageUpload = (id: string) => {
  const retry = retryHandlers.get(id);
  if (retry) { uploadStore.dismiss(id); retry(); }
};

const putWithProgress = (
  url: string,
  file: File,
  uploadId: string,
  onProgress: (fraction: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const clearStall = () => { if (stallTimer) clearTimeout(stallTimer); };
    const armStall = () => {
      clearStall();
      stallTimer = setTimeout(() => {
        request.abort();
        reject(new Error("The upload stopped responding. Check your connection and retry."));
      }, 45000);
    };
    request.open("PUT", url);
    request.timeout = 90000;
    request.setRequestHeader("Content-Type", file.type);
    activeRequests.set(uploadId, request);
    armStall();
    request.upload.onprogress = (event) => {
      armStall();
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => { clearStall(); activeRequests.delete(uploadId); request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("The upload was interrupted. Please try again.")); };
    request.onerror = () => { clearStall(); activeRequests.delete(uploadId); reject(new Error("We could not reach the server. Check your internet connection and try again.")); };
    request.onabort = () => { clearStall(); activeRequests.delete(uploadId); reject(new Error("The upload was cancelled or stopped responding. You can retry it.")); };
    request.ontimeout = () => { clearStall(); activeRequests.delete(uploadId); reject(new Error("The upload took too long. Check your connection and try again.")); };
    request.send(file);
  });

/**
 * Uploads one image and reports every step to the shared progress dialog.
 * Photos over 3 MB (most camera shots) are shrunk automatically. Only images are
 * accepted. An image picked from the media library is returned as-is, with no
 * second upload.
 */
export const uploadImage = async (
  file: File,
  kind: "logo" | "product" | "gallery" | "background",
): Promise<string> => {
  const fromLibrary = uploadStore.takeLibraryUrl(file.name);
  if (fromLibrary) return fromLibrary;

  const id = uploadStore.start(file.name);
  retryHandlers.set(id, () => { void uploadImage(file, kind); });
  try {
    if (file.type.startsWith("video/")) {
      throw new Error(
        "Only images can be uploaded here. Videos are not supported. To show a video, paste a YouTube link instead.",
      );
    }
    if (/heic|heif/i.test(file.type)) {
      throw new Error(
        "iPhone HEIC photos are not supported. Choose a JPG, PNG or WebP image, or set your camera to 'Most Compatible'.",
      );
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error("That file type is not supported. Please use a PNG, JPG or WebP image.");
    }

    let toSend = file;
    uploadStore.update(id, { step: "preparing", percent: 6, message: "Preparing your photo…" });
    toSend = await processImage(file, "original", 1600);
    if (toSend.size > MAX_IMAGE_BYTES) {
      if (toSend.size > MAX_IMAGE_BYTES) {
        throw new Error("This image is still too large after shrinking. Please choose a smaller one (under 3 MB).");
      }
    }

    uploadStore.update(id, { step: "preparing", percent: 15, message: "Preparing the upload…" });
    const { presignedUrl, url } = await postPresignUpload({
      kind,
      contentType: toSend.type as (typeof ALLOWED_IMAGE_TYPES)[number],
      sizeBytes: toSend.size,
    });

    uploadStore.update(id, { step: "uploading", percent: 20, message: "Uploading…" });
    await putWithProgress(presignedUrl, toSend, id, (fraction) =>
      uploadStore.update(id, {
        step: "uploading",
        percent: Math.round(20 + fraction * 70),
        message: `Uploading… ${Math.round(fraction * 100)}%`,
      }),
    );

    uploadStore.update(id, { step: "saving", percent: 94, message: "Saving to your library…" });
    await postRegisterMedia({
      kind,
      fileUrl: url,
      contentType: toSend.type,
      sizeBytes: toSend.size,
    });

    uploadStore.finish(id);
    retryHandlers.delete(id);
    return url;
  } catch (error) {
    const message = friendlyError(error, "The image could not be uploaded. Please try again.");
    uploadStore.fail(id, message);
    throw new Error(message);
  }
};
