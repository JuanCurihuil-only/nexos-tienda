/**
 * Achica y convierte fotos en el navegador (PC o celular) antes de subirlas.
 * Así el panel acepta cualquier foto y la tienda siempre recibe WebP livianos.
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = url;
  });
}

function toWebp(canvas: HTMLCanvasElement, quality: number) {
  const url = canvas.toDataURL("image/webp", quality);
  if (!url.startsWith("data:image/webp")) throw new Error("Tu navegador no puede convertir a WebP");
  return url;
}

/** Foto de producto: cuadrada 1200x1200, fondo blanco, producto centrado. */
export async function productPhoto(file: File) {
  const img = await loadImage(file);
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
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return { dataUrl: toWebp(c, 0.8), w: size, h: size };
}

/** Banner: recorte 1600x1008 para computadora y 800x504 para celular. */
export async function bannerPhotos(file: File) {
  const img = await loadImage(file);
  const make = (W: number, H: number, q: number) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const scale = Math.max(W / img.width, H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    return { dataUrl: toWebp(c, q), w: W, h: H };
  };
  return { lg: make(1600, 1008, 0.72), sm: make(800, 504, 0.65) };
}
