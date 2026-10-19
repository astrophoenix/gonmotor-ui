import { formatPlate } from '../../../shared/utils/formatPlate';

// Canales para hacer llegar la cotización al cliente. No hay envío desde el
// backend: se abre WhatsApp (wa.me) o el cliente de correo (mailto:) con el
// mensaje ya redactado, y el asesor adjunta el PDF si lo necesita.

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mensajeCotizacion(cotizacion) {
  const saludo = cotizacion.cliente_nombre ? `Hola ${cotizacion.cliente_nombre},` : 'Hola,';
  const placa = formatPlate(cotizacion.vehiculo_placa);
  const vehiculo = placa ? ` del vehículo ${placa}` : '';
  const taller = cotizacion.sucursal_nombre ? ` de ${cotizacion.sucursal_nombre}` : '';
  return [
    saludo,
    `le compartimos la cotización N° ${cotizacion.numero_cotizacion}${vehiculo} por un total de $ ${formatMoney(cotizacion.total)}.`,
    'Quedamos atentos a su respuesta.',
    `Saludos${taller}.`,
  ].join('\n');
}

// Los móviles ecuatorianos (09…) se pasan a formato internacional (5939…).
export function whatsappCotizacionHref(cotizacion) {
  let digitos = String(cotizacion?.cliente_telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 10 && digitos.startsWith('0')) digitos = `593${digitos.slice(1)}`;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensajeCotizacion(cotizacion))}`;
}

export function correoCotizacionHref(cotizacion) {
  const email = (cotizacion?.cliente_email || '').trim();
  if (!email) return null;
  const asunto = `Cotización N° ${cotizacion.numero_cotizacion}`;
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensajeCotizacion(cotizacion))}`;
}
