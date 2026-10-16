/**
 * Servicio del buscador global de la topbar.
 *
 * Un solo endpoint agrega clientes, vehículos, recepciones, órdenes,
 * cotizaciones, inspecciones, proveedores, repuestos y servicios, ya
 * filtrados por el tenant activo (la empresa sale del token de la sesión).
 */

import { request } from './httpClient';

/**
 * @param {string} q Término de búsqueda.
 * @param {AbortSignal} [signal] Para cancelar peticiones obsoletas.
 * @returns {Promise<{ q: string, total: number, grupos: Array }>}
 */
export function buscarGlobal(q, signal) {
  const params = new URLSearchParams({ q: q ?? '' });
  return request(`/api/core/buscar/?${params.toString()}`, { signal });
}
