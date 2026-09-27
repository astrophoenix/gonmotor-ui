import carCog from '@iconify-icons/mdi/car-cog';
import carSearch from '@iconify-icons/mdi/car-search';
import folderWrench from '@iconify-icons/mdi/folder-wrench';
import tagOutline from '@iconify-icons/mdi/tag-outline';
import carCrash from '@iconify-icons/bxs/car-crash';
import fileProtectOutlined from '@iconify-icons/ant-design/file-protect-outlined';
import carSparklesFilled from '@iconify-icons/boxicons/car-sparkles-filled';
import CarWrench from '../components/car-wrench.vue';

/**
 * Tipos de trabajo canónicos (apps/ordenes/models.py → TipoTrabajo).
 *
 * Única taxonomía del "motivo de ingreso": la comparten
 * `recepcion.tipo_recepcion`, `inspeccion.tipo_inspeccion` y
 * `orden.tipo_trabajo`. No duplicar listas por módulo.
 *
 * `icon` puede ser un componente Vue (p. ej. car-wrench.vue) o datos offline
 * de @iconify-icons (no requieren red en runtime).
 */
export const TIPOS_TRABAJO = [
  {
    value: 'MANTENIMIENTO',
    label: 'Mantenimiento',
    icon: carCog,
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  },
  {
    value: 'REPARACION',
    label: 'Reparación',
    icon: CarWrench,
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  {
    value: 'DIAGNOSTICO',
    label: 'Diagnóstico',
    icon: carSearch,
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  },
  {
    value: 'ESTETICA',
    label: 'Estética',
    icon: carSparklesFilled,
    color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
  },
  {
    value: 'GARANTIA',
    label: 'Garantía',
    icon: fileProtectOutlined,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  },
  {
    value: 'SINIESTRO',
    label: 'Siniestro',
    icon: carCrash,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  },
  {
    value: 'OTRO',
    label: 'Otro',
    icon: folderWrench,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200',
  },
];

/** Para `<select>`: solo value + label. */
export const TIPOS_TRABAJO_OPCIONES = TIPOS_TRABAJO.map(({ value, label }) => ({ value, label }));

/** Para valores fuera de la choices (ej. registros históricos sin tipo). */
export const TIPO_TRABAJO_FALLBACK = {
  value: '',
  label: 'Sin tipo',
  icon: tagOutline,
  color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

/** Alias heredados que aún podrían venir en datos guardados. */
const ALIAS_LEGACY = {
  PREVENTIVO: 'MANTENIMIENTO',
  CORRECTIVO: 'REPARACION',
  'REPARACIÓN': 'REPARACION',
};

/** Normaliza un valor recibido del API a un valor canónico (o `''` si no existe). */
export function normalizarTipoTrabajo(tipo) {
  if (!tipo) return '';
  const valor = String(tipo).trim();
  const canonico = ALIAS_LEGACY[valor] || valor;
  return TIPOS_TRABAJO.some((item) => item.value === canonico) ? canonico : '';
}

export function getTipoTrabajoConfig(tipo) {
  const canonico = normalizarTipoTrabajo(tipo);
  return TIPOS_TRABAJO.find((item) => item.value === canonico) || TIPO_TRABAJO_FALLBACK;
}

export function getTipoTrabajoLabel(tipo) {
  return getTipoTrabajoConfig(tipo).label;
}
