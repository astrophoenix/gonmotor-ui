import { ref } from 'vue';
import { descargarBlob, filenameDesdeContentDisposition } from '../utils/download';

/**
 * Descarga un PDF generado por el backend a partir de un "descargador".
 *
 * El descargador es una función que devuelve `{ blob, contentDisposition }`
 * (lo que devuelve `request(..., { responseType: 'blob' })`), para que este
 * composable no dependa del servicio de cada módulo.
 *
 * @param {{ onSuccess?: (mensaje: string) => void, onError?: (mensaje: string) => void }} [options]
 * @returns {{ isExportingPdf: import('vue').Ref<boolean>, exportarPdf: (descargador: () => Promise<{ blob: Blob, contentDisposition?: string }>) => Promise<void> }}
 */
export function usePdfExport(options = {}) {
  const isExportingPdf = ref(false);

  async function exportarPdf(descargador) {
    if (isExportingPdf.value || typeof descargador !== 'function') return;

    isExportingPdf.value = true;
    try {
      const { blob, contentDisposition } = await descargador();
      const filename = filenameDesdeContentDisposition(contentDisposition);
      descargarBlob(blob, filename);
      options.onSuccess?.(`PDF generado: ${filename}`);
    } catch (error) {
      const message = error.message || 'No se pudo generar el PDF.';
      if (options.onError) {
        options.onError(message);
        return;
      }
      throw error;
    } finally {
      isExportingPdf.value = false;
    }
  }

  return { isExportingPdf, exportarPdf };
}