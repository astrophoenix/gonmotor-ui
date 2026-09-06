/**
 * Servicio genérico y reutilizable de mejora de texto con IA.
 *
 * Usado por el componente TextImprover.vue y por cualquier pantalla que quiera
 * mejorar un campo de texto libre (motivo, observaciones, etc.).
 */
import { request } from './httpClient';

const ENDPOINT = '/api/core/mejorar-texto/';

/**
 * Mejora un texto en español usando el LLM configurado en el backend.
 *
 * @param {string} texto - Texto a mejorar.
 * @param {string} [contexto=''] - Pista del tipo de campo (ej. 'motivo de ingreso',
 *   'observaciones del tablero') para afinar la reescritura.
 * @returns {Promise<{mejorado: string}>}
 */
export function mejorarTexto(texto, contexto = '') {
  return request(ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ texto, contexto }),
  });
}