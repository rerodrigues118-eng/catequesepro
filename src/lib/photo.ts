export const MAX_PHOTO_BYTES = 300 * 1024;

export async function compressImage(file: File, maxWidth = 400, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Arquivo precisa ser uma imagem.");

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Falha ao ler arquivo."));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Falha ao carregar imagem."));
    i.src = dataUrl;
  });

  const ratio = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.drawImage(img, 0, 0, w, h);

  let q = quality;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length * 0.75 > MAX_PHOTO_BYTES && q > 0.4) {
    q -= 0.1;
    out = canvas.toDataURL("image/jpeg", q);
  }

  if (out.length * 0.75 > MAX_PHOTO_BYTES) {
    throw new Error("Imagem ainda excede 300kb após compressão. Use uma foto menor.");
  }

  return out;
}
