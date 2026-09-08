import { request } from '../../../shared/services/httpClient';

const BASE = '/api/notificaciones';

/**
 * Servicio del módulo de notificaciones WhatsApp / recordatorios de
 * mantenimiento. Todas las llamadas pasan por `httpClient` para que se
 * adjunten automáticamente el JWT y la cabecera X-Empresa-ID.
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

  /** Ejecuta el barrido de vehículos próximos a mantenimiento. */
  ejecutar({ preview = false, vehiculosIds = [] } = {}) {
    return request(`${BASE}/recordatorios/ejecutar/`, {
      method: 'POST',
      body: JSON.stringify({ preview, vehiculos_ids: vehiculosIds }),
    });
  },
};