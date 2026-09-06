import { request } from '../../../../shared/services/httpClient';

const ENDPOINT = '/api/servicios/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const serviciosService = {
  list({ page = 1, search = '', ordering = 'nombre', categoria = null } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    if (categoria) params.set('categoria', categoria);
    return request(`${ENDPOINT}?${params.toString()}`);
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
};