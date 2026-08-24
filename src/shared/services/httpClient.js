/**
 * Cliente HTTP central con auto-refresh de JWT y cabecera Tenant (Empresa).
 *
 * - Adjunta el access token y X-Empresa-ID automáticamente a cada request.
 * - Si el backend responde 401, usa el refresh token para obtener uno nuevo
 *   y reintenta la petición original sin intervención del usuario.
 * - Si el refresh falla, limpia la sesión y lanza un error controlado.
 */

import { API_BASE_URL } from '../config/env';

const NETWORK_ERROR_MESSAGE =
  'No fue posible conectar con el servidor. Verifica tu conexión a internet o intenta nuevamente en unos minutos.';

function getAccessToken() {
  return localStorage.getItem('gonmotor_access_token')
    || sessionStorage.getItem('gonmotor_access_token');
}

function getRefreshToken() {
  return localStorage.getItem('gonmotor_refresh_token')
    || sessionStorage.getItem('gonmotor_refresh_token');
}

function getEmpresaId() {
  return localStorage.getItem('gonmotor_empresa_id')
    || sessionStorage.getItem('gonmotor_empresa_id');
}

function getStorage() {
  if (localStorage.getItem('gonmotor_access_token')) {
    return localStorage;
  }

  if (sessionStorage.getItem('gonmotor_access_token')) {
    return sessionStorage;
  }

  return null;
}

function getErrorMessage(data) {
  if (data?.detail) {
    return data.detail;
  }

  if (data?.non_field_errors?.[0]) {
    return data.non_field_errors[0];
  }

  const fieldMessage = Object.values(data || {})
    .flat()
    .find((message) => typeof message === 'string');

  return fieldMessage || 'La solicitud no pudo completarse.';
}

function isNetworkError(error) {
  return (
    error instanceof TypeError ||
    error.name === 'TypeError' ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('fetch') ||
    !navigator.onLine
  );
}

let isRefreshing = false;
let refreshPromise = null;

/**
 * Solicita un nuevo access token al endpoint de refresh usando el refresh token almacenado.
 * Actualiza el storage con el nuevo access token y, si aplica, con el refresh token rotado.
 *
 * @returns {Promise<string>} Nuevo access token
 * @throws {Error} Si no hay refresh token o el endpoint responde con error
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al refrescar el token');
  }

  const data = await response.json();

  const storage = getStorage();
  if (storage) {
    storage.setItem('gonmotor_access_token', data.access);
    if (data.refresh) {
      storage.setItem('gonmotor_refresh_token', data.refresh);
    }
  }

  return data.access;
}

/**
 * Request HTTP con auto-refresh de JWT ante 401.
 *
 * - Adjunta el access token y la cabecera X-Empresa-ID automáticamente.
 * - Si el access token expiró, usa el refresh token para obtener uno nuevo
 *   y reintenta la petición original una sola vez.
 * - Si el refresh también falla, limpia la sesión y lanza un error controlado.
 *
 * @param {string} path - Ruta del endpoint relativa a API_BASE_URL
 * @param {RequestInit} [options={}] - Opciones adicionales de fetch
 * @returns {Promise<object>} Datos de la respuesta parseada
 * @throws {Error} Error de red, HTTP o sesión expirada
 */
export async function request(path, options = {}) {
  const token = getAccessToken();
  const empresaId = getEmpresaId();

  const isFormData = options.body instanceof FormData;
  const config = {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(empresaId ? { 'X-Empresa-ID': empresaId } : {}),
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, config);
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && token) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
      }

      try {
        const newToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newToken}`;

        const retryResponse = await fetch(`${API_BASE_URL}${path}`, config);
        const retryData = await retryResponse.json().catch(() => ({}));

        if (!retryResponse.ok) {
          const message = getErrorMessage(retryData);
          const error = new Error(message);
          error.status = retryResponse.status;
          error.data = retryData;
          throw error;
        }

        return retryData;
      } catch (refreshError) {
        [localStorage, sessionStorage].forEach((currentStorage) => {
          [
            'gonmotor_access_token',
            'gonmotor_refresh_token',
            'gonmotor_user',
            'gonmotor_logged_in',
            'gonmotor_empresa_id'
          ].forEach((key) => {
            currentStorage.removeItem(key);
          });
        });

        const sessionError = new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        sessionError.isSessionExpired = true;
        throw sessionError;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    if (!response.ok) {
      const message = getErrorMessage(data);
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.log('HTTP Client Error:', error);
    if (isNetworkError(error)) {
      const networkError = new Error(NETWORK_ERROR_MESSAGE);
      networkError.isNetworkError = true;
      throw networkError;
    }

    if (error.data?.message) {
      throw new Error(error.data.message);
    }

    throw new Error(
      error.message || 'Ocurrió un inconveniente al procesar la solicitud. Intente más tarde.'
    );
  }
}

export const httpClient = request;