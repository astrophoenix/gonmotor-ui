import { API_BASE_URL } from '../../../shared/config/env';
import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/recepciones/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export async function fetchRecepciones(token, empresaId) {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(empresaId ? { 'X-Empresa-ID': empresaId } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/api/recepciones/`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.detail || data?.non_field_errors?.[0] || 'No se pudo cargar las recepciones.';
    throw new Error(message);
  }

  return response.json();
}

export async function fetchRecepcion(token, empresaId, id) {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(empresaId ? { 'X-Empresa-ID': empresaId } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/api/recepciones/${id}/`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.detail || data?.non_field_errors?.[0] || 'No se pudo cargar la recepción.';
    throw new Error(message);
  }

  return response.json();
}

export const recepcionesService = {
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
};
