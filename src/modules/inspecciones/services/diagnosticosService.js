import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/inspecciones/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const diagnosticosService = {
  list({ page = 1, search = '', ordering = '-created_at' } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    return request(`${ENDPOINT}?${params.toString()}`);
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

  delete(id) {
    return request(buildUrl(id), {
      method: 'DELETE',
    });
  },

  getByRecepcion(recepcionId) {
    return request(`${ENDPOINT}?recepcion=${encodeURIComponent(recepcionId)}`);
  },
};
