import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/recepciones/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const recepcionesService = {
  list({ page = 1, search = '', ordering = '-created_at', filters = {}, signal } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) return;
      params.set(key, value);
    });
    return request(`${ENDPOINT}?${params.toString()}`, { signal });
  },

  getById(id) {
    return request(buildUrl(id));
  },

  create(formData) {
    return request(ENDPOINT, {
      method: 'POST',
      body: formData,
    });
  },

  update(id, formData) {
    return request(buildUrl(id), {
      method: 'PATCH',
      body: formData,
    });
  },

  listarRelaciones(id) {
    return request(`${buildUrl(id)}relaciones/`);
  },

  actualizarRelacion(id, payload) {
    return request(`${buildUrl(id)}relaciones/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  delete(id) {
    return request(buildUrl(id), {
      method: 'DELETE',
    });
  },
};
