export function formatCurrency(value, currency = 'USD') {
  const number = Number(value ?? 0);
  if (Number.isNaN(number)) return '—';
  return number.toLocaleString('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
}

export function formatNumber(value, digits = 2) {
  const number = Number(value ?? 0);
  if (Number.isNaN(number)) return '—';
  return number.toLocaleString('es-EC', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
/**
 * Referencia breve de un registro sin número propio (`#A3F9C2`). Los IDs de la
 * API son UUID: se usa el final (el inicio es un timestamp y se repite entre
 * registros creados a la vez). Equivale a `referencia_corta` del backend.
 */
export function referenciaCorta(id) {
  if (!id) return '';
  return `#${String(id).slice(-6).toUpperCase()}`;
}

/** Las citas no tienen número de documento: se identifican por su horario. */
export function etiquetaCita(cita) {
  if (!cita?.fecha_cita) return `Cita ${referenciaCorta(cita?.id)}`.trim();
  const [anio, mes, dia] = String(cita.fecha_cita).split('-');
  const hora = cita.hora_cita ? ` ${String(cita.hora_cita).slice(0, 5)}` : '';
  return `Cita ${dia}/${mes}/${anio}${hora}`;
}
