import { request } from '../../../shared/services/httpClient';

const BASE = '/api/notificaciones';

/**
 * Servicio del módulo de notificaciones WhatsApp / recordatorios de
 * mantenimiento. Todas las llamadas pasan por `httpClient` para que se
 * adjunten automáticamente el JWT (que lleva la empresa de la sesión).
 */
export const notificacionesService = {
  /** Estado del proveedor WhatsApp activo (mock / twilio / meta). */
  estado() {
    return request(`${BASE}/estado/`);
  },

  preferencias() {
    return request(`${BASE}/preferencias/`);
  },

  actualizarPreferencias(payload) {
    return request(`${BASE}/preferencias/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /** Bitácora de mensajes enviados/simulados. */
  listado({ estado = '', origen = '', limit = 50 } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (estado) params.set('estado', estado);
    if (origen) params.set('origen', origen);
    return request(`${BASE}/recordatorios/?${params.toString()}`);
  },

  /** Envía el recordatorio de mantenimiento de un vehículo específico. */
  enviarRecordatorio(vehiculoId) {
    return request(`${BASE}/recordatorios/enviar-vehiculo/`, {
      method: 'POST',
      body: JSON.stringify({ vehiculo_id: vehiculoId }),
    });
  },

  /** Mensaje de prueba gratuito hacia un número específico. */
  enviarPrueba({ celular, mensaje = '' }) {
    return request(`${BASE}/recordatorios/enviar-prueba/`, {
      method: 'POST',
      body: JSON.stringify({ celular, mensaje: mensaje || undefined }),
    });
  },

  // ── Cola de notificaciones programadas ──────────────────────────────────

  /** Listado paginado de la cola. Filtros: estado, tipo, canal, vehiculo, cliente… */
  listarProgramadas({ page = 1, filtros = {}, signal } = {}) {
    const params = new URLSearchParams({ page: String(page) });
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) params.set(clave, valor);
    });
    return request(`${BASE}/programadas/?${params.toString()}`, { signal });
  },

  /** Alta manual del próximo mantenimiento (reemplaza el pendiente del vehículo). */
  crearMantenimiento(payload) {
    return request(`${BASE}/programadas/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Edita una notificación pendiente (fecha, canal, asunto, mensaje…). */
  actualizarProgramada(id, payload) {
    return request(`${BASE}/programadas/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  cancelarProgramada(id) {
    return request(`${BASE}/programadas/${id}/cancelar/`, { method: 'POST' });
  },

  /** Envía ya una pendiente, o reintenta una con error. */
  enviarProgramadaAhora(id) {
    return request(`${BASE}/programadas/${id}/enviar-ahora/`, { method: 'POST' });
  },

  /** Aviso inmediato de "vehículo listo" de una orden COMPLETADO (409 si ya se avisó). */
  notificarRetiro(ordenId, { canal = 'whatsapp', reenviar = false } = {}) {
    return request(`/api/ordenes/ordenes-trabajo/${ordenId}/notificar-retiro/`, {
      method: 'POST',
      body: JSON.stringify({ canal, reenviar }),
    });
  },

  // ── Campañas ────────────────────────────────────────────────────────────

  listarCampanas({ page = 1, estado = '', signal } = {}) {
    const params = new URLSearchParams({ page: String(page) });
    if (estado) params.set('estado', estado);
    return request(`${BASE}/campanas/?${params.toString()}`, { signal });
  },

  obtenerCampana(id) {
    return request(`${BASE}/campanas/${id}/`);
  },

  crearCampana(payload) {
    return request(`${BASE}/campanas/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  actualizarCampana(id, payload) {
    return request(`${BASE}/campanas/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  eliminarCampana(id) {
    return request(`${BASE}/campanas/${id}/`, { method: 'DELETE' });
  },

  /** Destinatarios según el segmento: `{ total, muestra: [...] }` (máx. 50). */
  audienciaCampana(id) {
    return request(`${BASE}/campanas/${id}/audiencia/`);
  },

  lanzarCampana(id) {
    return request(`${BASE}/campanas/${id}/lanzar/`, { method: 'POST' });
  },

  cancelarCampana(id) {
    return request(`${BASE}/campanas/${id}/cancelar/`, { method: 'POST' });
  },
};
