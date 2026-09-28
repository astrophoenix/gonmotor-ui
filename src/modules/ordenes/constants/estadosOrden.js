import { estadoADisplay } from '../../../shared/utils/estadoFlujo';

/**
 * Estados de la orden de trabajo (apps/ordenes/models.py → EstadoOrden).
 * Los listados reutilizan los labels de `estadoFlujo.js` para no duplicarlos.
 */
export const ESTADOS_ORDEN_FILTRABLE = ['INGRESADO', 'EN_PROCESO', 'COMPLETADO', 'ENTREGADO', 'CANCELADO'];

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