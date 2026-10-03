import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/citas/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const citasService = {
  list({ page = 1, search = '', estado = '', fecha = '', desde = '', hasta = '', ordering = 'fecha_cita', pageSize = '', filters = {}, signal } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
    if (fecha) params.set('fecha', fecha);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (pageSize) params.set('page_size', String(pageSize));
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    return request(`${ENDPOINT}?${params.toString()}`, { signal });
  },

  getById(id) {
    return request(buildUrl(id));
  },

  disponibilidad(query = '') {
    return request(`${ENDPOINT}disponibilidad/${query ? `?${query}` : ''}`);
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
        throw new Error(`No se pudo eliminar la cita '${label}'. ${error.message}`);
      }
      throw error;
    });
  },

  convertirARecepcion(id) {
    return request(`${buildUrl(id)}convertir_a_recepcion/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};