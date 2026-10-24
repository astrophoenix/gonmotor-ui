// Etiquetas y formatos compartidos por las fichas que muestran vehículos
// (ficha del vehículo y vehículos dentro de la ficha del cliente).

export const TRANSMISION_LABELS = { M: 'Manual', A: 'Automática', C: 'CVT' };

export const COMBUSTIBLE_LABELS = {
  GAS: 'Gasolina',
  DIE: 'Diésel',
  HIB: 'Híbrido',
  ELE: 'Eléctrico',
  GNV: 'Gas Natural Vehicular (GNV)',
};

// Las fechas sin hora ('2026-11-02') se leen como fecha local: new Date() las tomaría
// como UTC y en Guayaquil mostraría el día anterior.
export function parseFecha(value) {
  if (!value) return null;
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = soloFecha ? new Date(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3]) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatFecha(value) {
  const date = parseFecha(value);
  if (!date) return null;
  return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatKm(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : `${number.toLocaleString('es-EC')} km`;
}

const COLORES = {
  blanco: '#FFFFFF', negro: '#111827', gris: '#9CA3AF', plata: '#D1D5DB', plateado: '#D1D5DB',
  rojo: '#DC2626', azul: '#2563EB', verde: '#16A34A', amarillo: '#FACC15', naranja: '#F97316',
  cafe: '#78350F', marron: '#78350F', beige: '#E7D7B8', dorado: '#CA8A04', vino: '#7F1D1D', celeste: '#7DD3FC',
};

export function colorCss(nombre) {
  if (!nombre) return null;
  const clave = nombre.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/)[0];
  return COLORES[clave] || null;
}

// Estado del próximo mantenimiento: tono 'vacio' (sin programar), 'pendiente' (gris),
// 'pronto' o 'vencido' (ámbar).
export function mantenimientoPorKm(v) {
  const valor = v && formatKm(v.proximo_mantenimiento_km);
  if (!valor) return { valor: null, detalle: 'Sin programar', tono: 'vacio' };
  const actual = Number(v.kilometraje_actual);
  if (v.kilometraje_actual == null || Number.isNaN(actual)) return { valor, detalle: '', tono: 'pendiente' };
  const restante = Number(v.proximo_mantenimiento_km) - actual;
  if (restante <= 0) return { valor, detalle: `Vencido hace ${formatKm(-restante)}`, tono: 'vencido' };
  return { valor, detalle: `Faltan ${formatKm(restante)}`, tono: restante <= 1000 ? 'pronto' : 'pendiente' };
}

export function mantenimientoPorFecha(v) {
  const fecha = v && parseFecha(v.proxima_mantenimiento_fecha);
  if (!fecha) return { valor: null, detalle: 'Sin programar', tono: 'vacio' };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((fecha - hoy) / 86400000);
  const valor = formatFecha(v.proxima_mantenimiento_fecha);
  if (dias < 0) return { valor, detalle: `Vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`, tono: 'vencido' };
  if (dias === 0) return { valor, detalle: 'Hoy', tono: 'pronto' };
  return { valor, detalle: `En ${dias} ${dias === 1 ? 'día' : 'días'}`, tono: dias <= 7 ? 'pronto' : 'pendiente' };
}

const PESO_TONO = { vacio: 0, pendiente: 1, pronto: 2, vencido: 3 };

// Resumen del mantenimiento de un vehículo: el aviso más urgente entre kilometraje y fecha.
export function mantenimientoResumen(v) {
  const km = mantenimientoPorKm(v);
  const fecha = mantenimientoPorFecha(v);
  const peor = PESO_TONO[fecha.tono] > PESO_TONO[km.tono] ? fecha : km;
  if (peor.tono === 'vencido') return { tono: 'vencido', etiqueta: 'Servicio vencido', detalle: peor.detalle };
  if (peor.tono === 'pronto') return { tono: 'pronto', etiqueta: 'Servicio próximo', detalle: peor.detalle };
  if (peor.tono === 'pendiente') {
    const proximo = fecha.valor ? `Próximo: ${fecha.valor}` : `Próximo: ${km.valor}`;
    return { tono: 'pendiente', etiqueta: 'Al día', detalle: proximo };
  }
  return { tono: 'vacio', etiqueta: 'Sin programar', detalle: '' };
}

export const TONO_DETALLE = {
  vacio: 'text-gray-400 dark:text-gray-500',
  pendiente: 'text-gray-500 dark:text-gray-400',
  pronto: 'text-warning',
  vencido: 'text-warning font-medium',
};
