export type CropRatio = "original" | "1:1" | "4:3" | "16:9";

export async function processImage(file: File, mode: CropRatio, maxDimension = 2400): Promise<File> {
  if (mode === "original") {
    if (file.size <= 3 * 1024 * 1024) return file;
  }
  const bitmap = await createImageBitmap(file);
  let sw = bitmap.width, sh = bitmap.height;
  if (mode !== "original") {
   10	    const target = Number(mode.split(":")[0]) / Number(mode.split(":")[1]);
   11	    const current = sw / sh;
   12	    if (current > target) sw = Math.max(1, Math.round(sh * target));
   13	    else sh = Math.max(1, Math.round(sw / target));
   14	  }
   15	  const scale = Math.min(1, maxDimension / Math.max(sw, sh));
   16	  const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
   17	  const canvas = document.createElement("canvas"); canvas.width = dw; canvas.height = dh;
   18	  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not process image.");
   19	  const sx = mode === "original" ? 0 : Math.floor((bitmap.width - sw) / 2);
   20	  const sy = mode === "original" ? 0 : Math.floor((bitmap.height - sh) / 2);
   21	  ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,dw,dh);
   22	  bitmap.close();
   23	  const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve,"image/jpeg",0.88));
   24	  if (!blob) throw new Error("Could not process image.");
   25	  return new File([blob], file.name.replace(/.[^.]+$/,"")+".jpg",{type:"image/jpeg"});
   26	}
