export const CATEGORIAS_GASTO = [
  { value: 'ARRIENDO', label: 'Arriendo' },
  { value: 'SUELDOS', label: 'Sueldos / Nómina' },
  { value: 'SERVICIOS', label: 'Servicios Básicos (Luz/Agua/Internet)' },
  { value: 'INSUMOS', label: 'Insumos / Compras menores' },
  { value: 'COMISIONES', label: 'Comisiones' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento local' },
  { value: 'TRANSPORTE', label: 'Transporte / Gasolina' },
  { value: 'OTROS', label: 'Otros' },
];

export const COLOR_CATEGORIA = {
  ARRIENDO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SUELDOS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SERVICIOS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  INSUMOS: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  COMISIONES: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  MANTENIMIENTO: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  TRANSPORTE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  OTROS: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};

export function categoriaLabel(value) {
  return CATEGORIAS_GASTO.find((c) => c.value === value)?.label || value || '—';
}
