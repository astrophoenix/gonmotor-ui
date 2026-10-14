import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/gastos/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    q.set(key, value);
  });
  const qs = q.toString();
  return qs ? `${ENDPOINT}?${qs}` : ENDPOINT;
}

export const gastosService = {
  list(filters = {}) {
    const { page, signal, ...rest } = filters;
    const params = { ...rest };
    if (page) params.page = String(page);
    return request(buildQuery(params), { signal });
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
