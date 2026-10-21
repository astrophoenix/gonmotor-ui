/**
 * Compresión de imágenes en el navegador antes de subirlas.
 *
 * Una foto de celular (3–8 MB) baja a ~400 KB: la subida con datos móviles
 * pasa de casi un minuto a segundos. El servidor igual reprocesa cada imagen
 * (no confía en el cliente), así que si el navegador no puede decodificarla
 * (HEIC en Chrome/Android) se envía el original y la reduce el backend.
 */

const EXTENSION = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

function aBlob(canvas, tipo, calidad) {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

function renombrar(nombre, tipo) {
  const base = String(nombre || 'imagen').replace(/\.[^.]+$/, '');
  return `${base}.${EXTENSION[tipo] || 'img'}`;
}

/**
 * @param {File} file
 * @param {{ lado_mayor: number, calidad: number, sin_perdida: boolean }} perfil
 * @returns {Promise<File>} la imagen reducida, o el original si no se puede
 *   (o no vale la pena) comprimir.
 */
export async function comprimirImagen(file, perfil) {
  if (typeof createImageBitmap !== 'function' || !perfil) return file;

  let bitmap;
  try {
    // Aplica la orientación EXIF: la foto no sale girada.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  let canvas;
  try {
    const escala = Math.min(1, perfil.lado_mayor / Math.max(bitmap.width, bitmap.height));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob;
    if (perfil.sin_perdida) {
      // Logo: conserva la transparencia.
      blob = await aBlob(canvas, 'image/png');
    } else {
      blob = await aBlob(canvas, 'image/webp', perfil.calidad);
      // Navegadores sin codificador WebP devuelven PNG: se usa JPEG.
      if (!blob || blob.type !== 'image/webp') {
        blob = await aBlob(canvas, 'image/jpeg', perfil.calidad);
      }
    }

    if (!blob || (escala === 1 && blob.size >= file.size)) return file;
    return new File([blob], renombrar(file.name, blob.type), {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    // El lienzo o el codificador pueden fallar: el backend procesa el original.
    return file;
  } finally {
    bitmap.close?.();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
