import { request } from '../../../../shared/services/httpClient';

const ENDPOINT = '/api/repuestos/';
const IMAGENES_ENDPOINT = '/api/repuestos-imagenes/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

function buildImagenUrl(id) {
  return `${IMAGENES_ENDPOINT}${encodeURIComponent(id)}/`;
}

function buildFormData(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
}

export const repuestosService = {
  list({ page = 1, search = '', ordering = 'nombre', categoria = null, stockBajo = false, estado = '', signal } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    if (categoria) params.set('categoria', categoria);
    if (stockBajo) params.set('stock_bajo', 'true');
    if (estado) params.set('estado', estado);
    return request(`${ENDPOINT}?${params.toString()}`, { signal });
  },

  getById(id) {
    return request(buildUrl(id));
  },

  opciones({ search = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const querystring = params.toString();
    return request(`${ENDPOINT}opciones/${querystring ? `?${querystring}` : ''}`);
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

  listImagenes(repuestoId) {
    return request(`${IMAGENES_ENDPOINT}?repuesto=${encodeURIComponent(repuestoId)}`);
  },

  createImagen(payload) {
    return request(IMAGENES_ENDPOINT, {
      method: 'POST',
      body: buildFormData(payload),
    });
  },

  updateImagen(id, payload) {
    return request(buildImagenUrl(id), {
      method: 'PATCH',
      body: buildFormData(payload),
    });
  },

  deleteImagen(id) {
    return request(buildImagenUrl(id), {
      method: 'DELETE',
    });
  },
};