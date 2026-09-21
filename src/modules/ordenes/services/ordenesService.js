import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/ordenes/ordenes-trabajo/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const ordenesService = {
  list({ page = 1, search = '', ordering = '-created_at', signal } = {}) {
    const params = new URLSearchParams({ page: String(page), ordering });
    if (search) params.set('search', search);
    return request(`${ENDPOINT}?${params.toString()}`, { signal });
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

  listServicios(ordenId) {
    return request(`/api/ordenes/ot-servicios/?orden=${encodeURIComponent(ordenId)}`);
  },

  createServicio(payload) {
    return request('/api/ordenes/ot-servicios/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateServicio(id, payload) {
    return request(`/api/ordenes/ot-servicios/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteServicio(id) {
    return request(`/api/ordenes/ot-servicios/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },

  listFotos(ordenId) {
    return request(`/api/ordenes/orden-fotos/?orden=${encodeURIComponent(ordenId)}`);
  },

  createFoto(payload) {
    return request('/api/ordenes/orden-fotos/', {
      method: 'POST',
      body: buildFormData(payload),
    });
  },

  updateFoto(id, payload) {
    return request(`/api/ordenes/orden-fotos/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: buildFormData(payload),
    });
  },

  deleteFoto(id) {
    return request(`/api/ordenes/orden-fotos/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },

  listRepuestos(ordenId) {
    return request(`/api/ordenes/ot-repuestos/?orden=${encodeURIComponent(ordenId)}`);
  },

  createRepuesto(payload) {
    return request('/api/ordenes/ot-repuestos/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRepuesto(id, payload) {
    return request(`/api/ordenes/ot-repuestos/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteRepuesto(id) {
    return request(`/api/ordenes/ot-repuestos/${encodeURIComponent(id)}/`, {
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