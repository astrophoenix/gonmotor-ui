import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/ordenes/ordenes-trabajo/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const ordenesService = {
  list({ page = 1, search = '', ordering = '-created_at' } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    return request(`${ENDPOINT}?${params.toString()}`);
  },

  getById(id) {
    return request(buildUrl(id));
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
};