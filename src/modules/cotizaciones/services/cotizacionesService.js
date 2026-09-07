import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/cotizaciones/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const cotizacionesService = {
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

  convertirAOrden(id) {
    return request(`${buildUrl(id)}convertir_a_orden/`, {
      method: 'POST',
    });
  },

  listServicios(cotizacionId) {
    return request(`/api/cotizaciones/servicios/?cotizacion=${encodeURIComponent(cotizacionId)}`);
  },

  createServicio(payload) {
    return request('/api/cotizaciones/servicios/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateServicio(id, payload) {
    return request(`/api/cotizaciones/servicios/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteServicio(id) {
    return request(`/api/cotizaciones/servicios/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },

  listRepuestos(cotizacionId) {
    return request(`/api/cotizaciones/repuestos/?cotizacion=${encodeURIComponent(cotizacionId)}`);
  },

  createRepuesto(payload) {
    return request('/api/cotizaciones/repuestos/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRepuesto(id, payload) {
    return request(`/api/cotizaciones/repuestos/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteRepuesto(id) {
    return request(`/api/cotizaciones/repuestos/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },
};