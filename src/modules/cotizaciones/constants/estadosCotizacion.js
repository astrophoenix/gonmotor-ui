import { ArrowLeftRight, CheckCircle2, Clock, FileText, Send, XCircle } from 'lucide-vue-next';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';

/**
 * Estados canónicos de cotización (apps/cotizaciones/models.py → EstadoCotizacion).
 * Color + icono + etiqueta en un solo lugar, reutilizado por el listado a
 * través de `EstadoCotizacionBadge.vue`.
 */
export const ESTADOS_COTIZACION = {
  PENDIENTE: { icon: FileText, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  ENVIADA: { icon: Send, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  ACEPTADA: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  RECHAZADA: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  VENCIDA: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  CONVERTIDA: { icon: ArrowLeftRight, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' },
};

/** Estados ofrecidos en los filtros. */
export const ESTADOS_COTIZACION_FILTRABLE = ['PENDIENTE', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA'];

/**
 * @param {string} estado         Estado crudo (PENDIENTE | ENVIADA | ...).
 * @param {string} [estadoDisplay] `estado_display` del backend; si falta se usa
 *                                 el label de `estadoFlujo.js`.
 */
export function getEstadoCotizacion(estado, estadoDisplay) {
  const actual = estado || 'PENDIENTE';
  const config = ESTADOS_COTIZACION[actual] || ESTADOS_COTIZACION.PENDIENTE;
  return { ...config, label: estadoDisplay || estadoADisplay('cotizacion', actual) };
}