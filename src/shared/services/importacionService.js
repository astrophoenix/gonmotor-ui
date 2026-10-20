import { request } from './httpClient';
import { descargarBlob } from '../utils/download';

/**
 * Servicio de importación masiva para `ImportWizardModal`.
 *
 * Todos los importadores del backend exponen las mismas rutas bajo su
 * endpoint (`apps/core/importacion.py`): `importar/[?validar=1]`,
 * `importar/errores/` e `importar/plantilla/`. Un módulo solo indica su
 * endpoint y el nombre con que se guardan los archivos descargados.
 *
 * @param {string} endpoint  p. ej. '/api/clientes/' (con barra final)
 * @param {string} nombre    p. ej. 'clientes' → plantilla_importacion_clientes.xlsx
 */
export function crearServicioImportacion(endpoint, nombre) {
  const archivoFormData = (archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return formData;
  };

  return {
    async descargarPlantilla() {
      const { blob } = await request(`${endpoint}importar/plantilla/`, { responseType: 'blob' });
      descargarBlob(blob, `plantilla_importacion_${nombre}.xlsx`);
    },
    /** Vista previa: misma lógica que la importación, sin guardar nada. */
    validar(archivo) {
      return request(`${endpoint}importar/?validar=1`, { method: 'POST', body: archivoFormData(archivo) });
    },
    importar(archivo) {
      return request(`${endpoint}importar/`, { method: 'POST', body: archivoFormData(archivo) });
    },
    async descargarErrores(errores) {
      const { blob } = await request(`${endpoint}importar/errores/`, {
        method: 'POST',
        body: JSON.stringify({ errores }),
        responseType: 'blob',
      });
      descargarBlob(blob, `errores_importacion_${nombre}.xlsx`);
    },
  };
}
