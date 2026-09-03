import { request } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/env';

function getAccessToken() {
  return localStorage.getItem('gonmotor_access_token')
    || sessionStorage.getItem('gonmotor_access_token');
}

function getEmpresaId() {
  return localStorage.getItem('gonmotor_empresa_id')
    || sessionStorage.getItem('gonmotor_empresa_id');
}

const ENDPOINT = '/api/clientes/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

function getAuthHeaders() {
  const headers = {};
  const token = getAccessToken();
  const empresaId = getEmpresaId();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers['X-Empresa-ID'] = empresaId;
  return headers;
}

export const clientsService = {
  list({ page = 1, search = '', ordering = 'nombre' } = {}) {
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

  importarArchivo(file, onProgress) {
    const formData = new FormData();
    formData.append('archivo', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}${ENDPOINT}importar/`);
      Object.entries(getAuthHeaders()).forEach(([key, value]) => xhr.setRequestHeader(key, value));

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let data = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          data = {};
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          const message = data?.detail || data?.non_field_errors?.[0]
            || `Ocurrió un error al importar (status ${xhr.status}).`;
          const error = new Error(message);
          error.status = xhr.status;
          error.data = data;
          reject(error);
        }
      };

      xhr.onerror = () => {
        reject(new Error('No fue posible conectar con el servidor. Verifica tu conexión.'));
      };

      xhr.send(formData);
    });
  },

  async descargarErrores(errores) {
    const response = await fetch(`${API_BASE_URL}${ENDPOINT}importar/errores/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ errores }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.detail || 'No se pudo generar el Excel de errores.');
    }

    const blob = await response.blob();
    downloadBlob(blob, 'errores_importacion_clientes.xlsx');
  },

  async descargarPlantilla() {
    const response = await fetch(`${API_BASE_URL}${ENDPOINT}importar/plantilla/`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.detail || 'No se pudo descargar la plantilla.');
    }

    const blob = await response.blob();
    downloadBlob(blob, 'plantilla_importacion_clientes.xlsx');
  },
};

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
