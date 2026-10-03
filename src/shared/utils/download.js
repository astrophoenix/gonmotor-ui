/**
 * Utilidades para descargar archivos binarios generados por el backend (PDF,
 * Excel) sin abandonar la aplicación.
 */

/**
 * Dispara la descarga de un blob en el navegador.
 *
 * @param {Blob} blob - Contenido del archivo
 * @param {string} filename - Nombre propuesto para el archivo
 */
export function descargarBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Extrae el nombre de archivo de una cabecera `Content-Disposition`.
 *
 * @param {string} header - Valor de la cabecera (p. ej. `attachment; filename="cotizacion_COT-1.pdf"`)
 * @param {string} [fallback='documento.pdf'] - Nombre a usar si no se puede leer
 * @returns {string} Nombre de archivo sanitizado
 */
export function filenameDesdeContentDisposition(header, fallback = 'documento.pdf') {
  if (!header) return fallback;

  const quoted = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  const nombre = quoted ? decodeURIComponent(quoted[1]) : '';
  return nombre.trim() || fallback;
}