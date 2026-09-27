import { Clock, CircleCheck, LoaderCircle } from 'lucide-vue-next';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';

/**
 * Estados canónicos de inspección (apps/ordenes/models.py → ESTADO_CHOICES).
 * Color + icono + etiqueta en un solo lugar, reutilizado por el listado a
 * través de `EstadoInspeccionBadge.vue`.
 */
export const ESTADOS_INSPECCION = {
  PENDIENTE: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  EN_PROCESO: { icon: LoaderCircle, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  FINALIZADA: { icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
};

/** Estados ofrecidos en los filtros. */
export const ESTADOS_INSPECCION_FILTRABLE = ['PENDIENTE', 'EN_PROCESO', 'FINALIZADA'];

/**
 * @param {string} estado         Estado crudo (PENDIENTE | EN_PROCESO | FINALIZADA).
 * @param {string} [estadoDisplay] `estado_display` del backend; si falta se usa
 *                                 el label de `estadoFlujo.js`.
 */
export function getEstadoInspeccion(estado, estadoDisplay) {
  const actual = estado || 'PENDIENTE';
  const config = ESTADOS_INSPECCION[actual] || ESTADOS_INSPECCION.PENDIENTE;
  return { ...config, label: estadoDisplay || estadoADisplay('inspeccion', actual) };
}
