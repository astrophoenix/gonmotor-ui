import { request } from '../../../shared/services/httpClient';

// CRUD de empresas (tenants): exclusivo del administrador del SaaS.
const ENDPOINT = '/api/empresas/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const empresasService = {
  list({ page = 1, search = '', estado = '', signal } = {}) {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
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
};
