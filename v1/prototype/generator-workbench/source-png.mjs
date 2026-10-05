// Rasterize the exact verified source SVG, not a screenshot or cropped preview.
export async function sourcePng(referenceSvg, signal) {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const url = URL.createObjectURL(new Blob([referenceSvg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Current source SVG could not be rasterized"));
      image.src = url;
    });
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const painter = canvas.getContext("2d");
    if (!painter) throw new Error("Source PNG export is unavailable");
    painter.drawImage(image, 0, 0, 512, 512);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((png) =>
      png ? resolve(png) : reject(new Error("Source PNG export failed")), "image/png"));
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export async function pngRequest(blob) {
  if (blob.size > 1024 * 1024) throw new Error("Source PNG exceeds1MiB");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return { base64: btoa(binary), sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("") };
}
