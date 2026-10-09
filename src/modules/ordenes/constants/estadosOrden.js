import { Clock, CircleCheck, CircleSlash, Hourglass, CheckCheck, Wrench } from 'lucide-vue-next';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';

/**
 * Estados de la orden de trabajo (apps/ordenes/models.py → EstadoOrden).
 * Color + icono + etiqueta en un solo lugar, reutilizado por listado, edición
 * y detalle a través de `EstadoOrdenBadge.vue`.
 */
export const ESTADOS_ORDEN = {
  PENDIENTE: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  EN_ESPERA: { icon: Hourglass, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' },
  EN_PROCESO: { icon: Wrench, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  COMPLETADO: { icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  ENTREGADO: { icon: CheckCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  CANCELADO: { icon: CircleSlash, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
};

/** Estados ofrecidos en los filtros. */
export const ESTADOS_ORDEN_FILTRABLE = ['PENDIENTE', 'EN_ESPERA', 'EN_PROCESO', 'COMPLETADO', 'ENTREGADO', 'CANCELADO'];

/**
 * @param {string} estado         Estado crudo (PENDIENTE | EN_ESPERA | EN_PROCESO | ...).
 * @param {string} [estadoDisplay] `estado_display` del backend; si falta se usa
 *                                 el label de `estadoFlujo.js`.
 */
export function getEstadoOrden(estado, estadoDisplay) {
  const actual = estado || 'PENDIENTE';
  const config = ESTADOS_ORDEN[actual] || ESTADOS_ORDEN.PENDIENTE;
  return { ...config, label: estadoDisplay || estadoADisplay('orden', actual) };
}

/** Prioridades de la orden (apps/ordenes/models.py → Prioridad). */
export const PRIORIDADES_ORDEN = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente / Emergencia' },
];

/** Prioridades ofrecidas en los filtros. */
export const PRIORIDADES_ORDEN_FILTRABLE = PRIORIDADES_ORDEN.map((item) => item.value);

export function estadoOrdenLabel(estado) {
  return estadoADisplay('orden', estado);
}