import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/vehiculos/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const vehiclesService = {
  list({ page = 1, search = '', ordering = 'placa', cliente = null } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    if (cliente) params.set('cliente', String(cliente));
    return request(`${ENDPOINT}?${params.toString()}`);
  },

  getById(id) {
    return request(buildUrl(id));
  },

  create(payload, formData) {
    const body = formData || JSON.stringify(payload);
    const headers = formData ? {} : { 'Content-Type': 'application/json' };
    return request(ENDPOINT, {
      method: 'POST',
      body,
      headers,
    });
  },

  update(id, payload, formData) {
    const body = formData || JSON.stringify(payload);
    const headers = formData ? {} : { 'Content-Type': 'application/json' };
    return request(buildUrl(id), {
      method: 'PATCH',
      body,
      headers,
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
