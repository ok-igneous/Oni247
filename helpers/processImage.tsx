export type CropRatio = "original" | "1:1" | "4:3" | "16:9";

export async function processImage(file: File, mode: CropRatio, maxDimension = 2400): Promise<File> {
  const bitmap = await createImageBitmap(file);
  if (mode === "original" && file.size <= 3 * 1024 * 1024 && Math.max(bitmap.width, bitmap.height) <= maxDimension) {
    bitmap.close();
    return file;
  }
  let sw = bitmap.width, sh = bitmap.height;
  if (mode !== "original") {
    const target = Number(mode.split(":")[0]) / Number(mode.split(":")[1]);
    const current = sw / sh;
    if (current > target) sw = Math.max(1, Math.round(sh * target));
    else sh = Math.max(1, Math.round(sw / target));
  }
  const scale = Math.min(1, maxDimension / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas"); canvas.width = dw; canvas.height = dh;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not process image.");
  const sx = mode === "original" ? 0 : Math.floor((bitmap.width - sw) / 2);
  const sy = mode === "original" ? 0 : Math.floor((bitmap.height - sh) / 2);
  ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,dw,dh);
  bitmap.close();
  const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve,"image/jpeg",0.88));
  if (!blob) throw new Error("Could not process image.");
  return new File([blob], file.name.replace(/.[^.]+$/,"")+".jpg",{type:"image/jpeg"});
}
