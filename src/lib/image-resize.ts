/**
 * Achica fotos en el navegador (PC o celular) antes de subirlas.
 * Acepta el formato que traiga el archivo: JPG, PNG, WEBP, GIF, HEIC, etc.
 */

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  ico: "image/x-icon",
};

type Drawable = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

function mimeFromName(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? (file.type.startsWith("image/") ? file.type : "");
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

async function openImage(file: File): Promise<Drawable> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    /* el navegador no decodificó el archivo directo */
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    /* sigue el intento con el tipo corregido */
  } finally {
    URL.revokeObjectURL(url);
  }
  const dataUrl = await readFile(file);
  const img = await loadImageElement(dataUrl);
  return { source: img, width: img.naturalWidth, height: img.naturalHeight };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const comma = raw.indexOf(",");
      const mime = mimeFromName(file);
      if (raw.startsWith("data:image/") && !raw.startsWith("data:image/svg")) {
        resolve(raw);
        return;
      }
      if (!mime || mime.includes("svg") || comma < 0) {
        reject(new Error("Ese archivo no es una imagen."));
        return;
      }
      resolve(`data:${mime};base64,${raw.slice(comma + 1)}`);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function encode(canvas: HTMLCanvasElement, quality: number) {
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return webp;
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  if (jpeg.startsWith("data:image/jpeg")) return jpeg;
  const png = canvas.toDataURL("image/png");
  if (png.startsWith("data:image/")) return png;
  throw new Error("No se pudo preparar la imagen");
}

/** Si el navegador no puede achicarla, se sube el archivo tal cual. */
async function originalImage(file: File) {
  const dataUrl = await readFile(file);
  return { dataUrl, w: 1200, h: 1200 };
}

/** Foto de producto: cuadrada 1200x1200, fondo blanco, producto centrado. */
export async function productPhoto(file: File) {
  let img: Drawable;
  try {
    img = await openImage(file);
  } catch {
    return originalImage(file);
  }
  try {
    const size = 1200;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min(size / img.width, size / img.height, 1.5);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, (size - w) / 2, (size - h) / 2, w, h);
    return { dataUrl: encode(c, 0.8), w: size, h: size };
  } catch {
    return originalImage(file);
  } finally {
    img.close?.();
  }
}

/** Banner: recorte 1600x1008 para computadora y 800x504 para celular. */
export async function bannerPhotos(file: File) {
  let img: Drawable;
  try {
    img = await openImage(file);
  } catch {
    const original = await originalImage(file);
    return { lg: original, sm: original };
  }
  try {
    const make = (W: number, H: number, q: number) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      const scale = Math.max(W / img.width, H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img.source, (W - w) / 2, (H - h) / 2, w, h);
      return { dataUrl: encode(c, q), w: W, h: H };
    };
    return { lg: make(1600, 1008, 0.72), sm: make(800, 504, 0.65) };
  } catch {
    const original = await originalImage(file);
    return { lg: original, sm: original };
  } finally {
    img.close?.();
  }
}
