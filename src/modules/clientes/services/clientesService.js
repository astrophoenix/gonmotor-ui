import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/clientes/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const clientsService = {
  list({ page = 1, search = '', ordering = 'nombre' } = {}) {
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
};
