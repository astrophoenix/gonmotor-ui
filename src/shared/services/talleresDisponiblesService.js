import { request } from './httpClient';

const ENDPOINT = '/api/auth/talleres/';

/**
 * Talleres en los que el usuario puede operar dentro de la empresa activa.
 *
 * @param {string} [search=''] - Texto opcional para filtrar por nombre, código,
 *   ciudad, dirección o teléfono.
 * @param {AbortSignal} [signal] - Señal para cancelar peticiones obsoletas.
 * @returns {Promise<{ total: number, resultados: Array<object> }>}
 */
export function listarTalleresDisponibles(search = '', signal) {
  const termino = (search ?? '').trim();
  const query = termino ? `?search=${encodeURIComponent(termino)}` : '';
  return request(`${ENDPOINT}${query}`, { signal });
}
