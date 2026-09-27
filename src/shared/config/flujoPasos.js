import { ClipboardList, Receipt, FileSearchCorner, Wrench } from 'lucide-vue-next';

/**
 * Pasos canónicos del flujo taller:
 * Recepción → Inspección → Cotización → Orden de trabajo.
 *
 * Cada paso tiene un color estable para que el mismo paso se reconozca a simple
 * vista en cualquier listado. `RelacionesFlujo.vue` los pinta; los adaptadores
 * de `utils/relacionesFlujo.js` decide qué pasos mostrar en cada módulo.
 */
export const PASOS_FLUJO = {
  recepcion: {
    label: 'Recepción',
    icon: ClipboardList,
    color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/60',
  },
  inspeccion: {
    label: 'Inspección',
    icon: FileSearchCorner,
    color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/60',
  },
  cotizacion: {
    label: 'Cotización',
    icon: Receipt,
    color: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800 dark:hover:bg-amber-900/60',
  },
  orden: {
    label: 'Orden Trabajo',
    icon: Wrench,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/60',
  },
};

/** Ruta del detalle de cada paso, para el enlace del chip. */
export const RUTAS_FLUJO = {
  recepcion: (id) => `/crud/recepciones/ver/?id=${encodeURIComponent(id)}`,
  inspeccion: (id) => `/crud/inspecciones/ver/?id=${encodeURIComponent(id)}`,
  cotizacion: (id) => `/crud/cotizaciones/ver/?id=${encodeURIComponent(id)}`,
  orden: (id) => `/crud/ordenes/ver/?id=${encodeURIComponent(id)}`,
};
