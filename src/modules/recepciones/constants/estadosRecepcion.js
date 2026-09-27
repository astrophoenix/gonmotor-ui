import { Clock, CircleCheck, CircleSlash } from 'lucide-vue-next';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';

/**
 * Estados canónicos de recepción (apps/ordenes/models.py → ESTADO_CHOICES).
 * Fuente única de la presentación: color + icono + etiqueta se comparten entre
 * listados, edición y detalle mediante `EstadoRecepcionBadge.vue`.
 */
export const ESTADOS_RECEPCION = {
  PENDIENTE: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  ACEPTADA: { icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  NO_ACEPTADA: { icon: CircleSlash, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
};

/** Estados ofrecidos en los filtros. */
export const ESTADOS_FILTRABLE = ['PENDIENTE', 'ACEPTADA', 'NO_ACEPTADA'];

/**
 * @param {string} estado         Estado crudo (PENDIENTE | ACEPTADA | NO_ACEPTADA).
 * @param {string} [estadoDisplay] `estado_display` del backend; si falta se usa
 *                                 el label de `estadoFlujo.js`.
 */
export function getEstadoRecepcion(estado, estadoDisplay) {
  const actual = estado || 'PENDIENTE';
  const config = ESTADOS_RECEPCION[actual] || ESTADOS_RECEPCION.PENDIENTE;
  return { ...config, label: estadoDisplay || estadoADisplay('recepcion', actual) };
}
