import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/cotizaciones/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const cotizacionesService = {
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

  listarRelaciones(id) {
    return request(`${buildUrl(id)}relaciones/`);
  },

  actualizarRelacion(id, payload) {
    return request(`${buildUrl(id)}relaciones/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  generarOrden(id, payload = {}) {
    return request(`${buildUrl(id)}generar_orden/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Descarga el PDF del documento de cotización.
   *
   * Disponible para cualquier estado: el backend no filtra por `estado`, así que
   * un borrador se exporta igual que una aceptada.
   *
   * @param {number|string} id - Id de la cotización
   * @returns {Promise<{ blob: Blob, contentDisposition: string }>}
   */
  exportarPdf(id) {
    return request(`${buildUrl(id)}exportar-pdf/`, { responseType: 'blob' });
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