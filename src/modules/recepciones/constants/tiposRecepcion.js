import carCog from '@iconify-icons/mdi/car-cog';
import carSearch from '@iconify-icons/mdi/car-search';
import folderWrench from '@iconify-icons/mdi/folder-wrench';
import tagOutline from '@iconify-icons/mdi/tag-outline';
import carMechanic from '@iconify-icons/bxs/car-mechanic';
import carCrash from '@iconify-icons/bxs/car-crash';
import fileProtectOutlined from '@iconify-icons/ant-design/file-protect-outlined';
import carSparklesFilled from '@iconify-icons/boxicons/car-sparkles-filled';

/**
 * Tipos de recepción canónicos (apps/ordenes/models.py → TIPOS_CHOICES).
 * `icon` son datos offline de @iconify-icons (no requieren red en runtime).
 */
export const TIPOS_RECEPCION = [
  {
    value: 'MANTENIMIENTO',
    label: 'Mantenimiento',
    icon: carCog,
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  },
  {
    value: 'REPARACIÓN',
    label: 'Reparación',
    icon: carMechanic,
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

/** Para valores fuera de las choices (ej. el legacy `PREVENTIVO` o el default `PENDIENTE`). */
export const TIPO_RECEPCION_FALLBACK = {
  value: '',
  label: 'Sin tipo',
  icon: tagOutline,
  color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export function getTipoRecepcionConfig(tipo) {
  return TIPOS_RECEPCION.find((item) => item.value === tipo) || TIPO_RECEPCION_FALLBACK;
}
