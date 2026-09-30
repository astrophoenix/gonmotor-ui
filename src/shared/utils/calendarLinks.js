/**
 * Utilidades para llevar una cita al calendario del cliente.
 *
 * El backend devuelve las horas como `fecha_cita` (YYYY-MM-DD) y
 * `hora_cita`/`hora_fin` (HH:MM): son la hora local del taller, por lo que se
 * emiten en tiempo local flotante (sin sufijo Z) tanto en el enlace de Google
 * como en el archivo .ics.
 */

function compactar(fecha, hora) {
  const dia = String(fecha || '').replace(/-/g, '');
  const reloj = String(hora || '00:00').slice(0, 5).replace(':', '');
  return `${dia}T${reloj}00`;
}

function serializarParametros(pares) {
  return pares
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)
    .join('&');
}

export function resumenCita(cita) {
  const taller = (cita && cita.taller_nombre) || 'taller';
  const placa = cita && cita.vehiculo && cita.vehiculo.placa;
  return placa ? `Cita en ${taller} - ${placa}` : `Cita en ${taller}`;
}

export function detalleCita(cita) {
  const lineas = [];
  if (cita.taller_nombre) lineas.push(`Taller: ${cita.taller_nombre}`);
  if (cita.cliente && cita.cliente.nombre) lineas.push(`Cliente: ${cita.cliente.nombre}`);
  if (cita.vehiculo) {
    const { marca, modelo, placa } = cita.vehiculo;
    lineas.push(`Vehículo: ${marca} ${modelo} (${placa})`);
  }
  if (cita.motivo_display) lineas.push(`Motivo: ${cita.motivo_display}`);
  if (cita.motivo_descripcion) lineas.push(cita.motivo_descripcion);
  if (cita.hora_fin) lineas.push(`Horario: ${cita.hora_cita} – ${cita.hora_fin}`);
  return lineas.join('\n');
}

export function ubicacionCita(cita) {
  return [cita.taller_direccion, cita.taller_nombre].filter(Boolean).join(', ');
}

export function rangoHorarioCita(cita) {
  if (!cita || !cita.hora_cita) return '';
  const fin = cita.hora_fin || cita.hora_cita;
  return `${String(cita.hora_cita).slice(0, 5)} – ${String(fin).slice(0, 5)}`;
}

export function fechaLegibleCita(cita) {
  if (!cita || !cita.fecha_cita) return '—';
  const [anio, mes, dia] = String(cita.fecha_cita).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** URL para precargar la cita en Google Calendar. */
export function googleCalendarUrl(cita) {
  const parametros = serializarParametros([
    ['action', 'TEMPLATE'],
    ['text', resumenCita(cita)],
    ['dates', `${compactar(cita.fecha_cita, cita.hora_cita)}/${compactar(cita.fecha_cita, cita.hora_fin)}`],
    ['details', detalleCita(cita)],
    ['location', ubicacionCita(cita)],
  ]);
  return `https://calendar.google.com/calendar/render?${parametros}`;
}

/** Copia texto al portapapeles con respaldo para contextos no seguros. */
export async function copiarAlPortapapeles(texto) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const copiado = document.execCommand('copy');
  document.body.removeChild(area);
  if (!copiado) throw new Error('No se pudo copiar el enlace.');
}
