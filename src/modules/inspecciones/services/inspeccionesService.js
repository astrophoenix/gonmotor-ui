import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/ordenes/inspecciones/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const inspeccionesService = {
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

  listarRelaciones(id) {
    return request(`${buildUrl(id)}relaciones/`);
  },

  actualizarRelacion(id, payload) {
    return request(`${buildUrl(id)}relaciones/`, {
      method: 'POST',
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

  crearDesdeRecepcion(recepcionId, cotizaciones = null) {
    const opciones = { method: 'POST' };
    if (Array.isArray(cotizaciones)) {
      opciones.body = JSON.stringify({ cotizaciones });
    }
    return request(
      `/api/recepciones/${encodeURIComponent(recepcionId)}/crear-inspeccion/`,
      opciones
    );
  },

  cotizacionesCandidatas(recepcionId) {
    return request(
      `/api/recepciones/${encodeURIComponent(recepcionId)}/cotizaciones-candidatas/`
    );
  },

  listFotos(inspeccionId) {
    return request(`/api/ordenes/inspeccion-fotos/?inspeccion=${encodeURIComponent(inspeccionId)}`);
  },

  createFoto(payload) {
    return request('/api/ordenes/inspeccion-fotos/', {
      method: 'POST',
      body: buildFormData(payload),
    });
  },

  updateFoto(id, payload) {
    return request(`/api/ordenes/inspeccion-fotos/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: buildFormData(payload),
    });
  },

  deleteFoto(id) {
    return request(`/api/ordenes/inspeccion-fotos/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },
};

function buildFormData(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
}
