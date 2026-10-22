import {
  Ban, CalendarClock, CircleAlert, CircleCheck, Clock, FlaskConical, Megaphone, PencilLine, Send,
} from 'lucide-vue-next';

/**
 * Estados que muestra el módulo de notificaciones, en un solo mapa:
 * - cola `NotificacionProgramada` (PENDIENTE, ENVIADA, ERROR, CANCELADA),
 * - historial de envíos (ENVIADO, SIMULADO, ERROR),
 * - campañas (BORRADOR, LANZADA, CANCELADA).
 * Lo consume `EstadoNotificacionBadge.vue`.
 */
export const ESTADOS_NOTIFICACION = {
  PENDIENTE: { label: 'Pendiente', icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  ENVIADA: { label: 'Enviada', icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  ENVIADO: { label: 'Enviado', icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  SIMULADO: { label: 'Simulado', icon: FlaskConical, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  ERROR: { label: 'Error', icon: CircleAlert, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  CANCELADA: { label: 'Cancelada', icon: Ban, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  BORRADOR: { label: 'Borrador', icon: PencilLine, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  LANZADA: { label: 'Lanzada', icon: Send, color: 'bg-brand-100 text-brand-800 dark:bg-brand-700/40 dark:text-brand-100' },
};

export function getEstadoNotificacion(estado, estadoDisplay) {
  const config = ESTADOS_NOTIFICACION[estado] || ESTADOS_NOTIFICACION.PENDIENTE;
  return { ...config, label: estadoDisplay || config.label };
}

/** Filtro de estado de la cola. */
export const ESTADOS_COLA = ['PENDIENTE', 'ENVIADA', 'ERROR', 'CANCELADA'];

/** Tipos de aviso (apps/notificaciones/models.py → NotificacionProgramada.Tipo). */
export const TIPOS_NOTIFICACION = {
  RETIRO: { label: 'Listo para retiro', icon: CircleCheck },
  MANTENIMIENTO: { label: 'Próximo mantenimiento', icon: CalendarClock },
  CITA_24H: { label: 'Cita (24 h antes)', icon: Clock },
  CITA_2H: { label: 'Cita (2 h antes)', icon: Clock },
  MASIVA: { label: 'Campaña', icon: Megaphone },
};

export function tipoNotificacionLabel(tipo, tipoDisplay) {
  return tipoDisplay || TIPOS_NOTIFICACION[tipo]?.label || tipo;
}

export const CANALES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'correo', label: 'Correo' },
];

export function canalLabel(canal) {
  return CANALES.find((c) => c.value === canal)?.label || canal || '—';
}

/** Placeholders admitidos en el mensaje de una campaña. */
export const PLACEHOLDERS_CAMPANA = ['{cliente}', '{empresa}'];
