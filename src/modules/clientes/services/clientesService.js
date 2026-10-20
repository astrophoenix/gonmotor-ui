import { request } from '../../../shared/services/httpClient';
import { descargarBlob } from '../../../shared/utils/download';

const ENDPOINT = '/api/clientes/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const clientsService = {
  list({ page = 1, search = '', ordering = 'nombre', estado = '', tipoIdentificacion = '', minVehiculos = '', signal } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
    if (tipoIdentificacion) params.set('tipo_identificacion', tipoIdentificacion);
    if (minVehiculos) params.set('min_vehiculos', minVehiculos);
    return request(`${ENDPOINT}?${params.toString()}`, { signal });
  },

  getById(id) {
    return request(buildUrl(id));
  },

  create(payload) {
    return request(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(buildUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete(id, label) {
    return request(buildUrl(id), {
      method: 'DELETE',
    }).catch((error) => {
      if (error.isNetworkError && label) {
        throw new Error(`No se pudo eliminar '${label}'. ${error.message}`);
      }
      throw error;
    });
  },

  reactivar(id) {
    return request(`${buildUrl(id)}reactivar/`, {
      method: 'POST',
    });
  },

  /**
   * Vista previa: misma lógica que la importación, sin guardar nada.
   * Devuelve totales y `filas` con el estado de cada una.
   */
  validarImportacion(file) {
    return request(`${ENDPOINT}importar/?validar=1`, { method: 'POST', body: archivoFormData(file) });
  },

  importarArchivo(file) {
    return request(`${ENDPOINT}importar/`, { method: 'POST', body: archivoFormData(file) });
  },

  async descargarErrores(errores) {
    const { blob } = await request(`${ENDPOINT}importar/errores/`, {
      method: 'POST',
      body: JSON.stringify({ errores }),
      responseType: 'blob',
    });
    descargarBlob(blob, 'errores_importacion_clientes.xlsx');
  },

  async descargarPlantilla() {
    const { blob } = await request(`${ENDPOINT}importar/plantilla/`, { responseType: 'blob' });
    descargarBlob(blob, 'plantilla_importacion_clientes.xlsx');
  },
};

function archivoFormData(file) {
  const formData = new FormData();
  formData.append('archivo', file);
  return formData;
}
