export const idDocumento = (valor) => valor?.id ?? valor ?? null;

export function visitaCotizacion(cotizacion, inspeccion = null) {
  const recepcion = idDocumento(cotizacion.recepcion_origen) || idDocumento(inspeccion?.recepcion);
  if (recepcion) return `recepcion:${recepcion}`;
  const id = idDocumento(cotizacion.inspeccion_origen);
  return id ? `inspeccion:${id}` : null;
}

export function motivoIncompatibilidad(cotizacion, seleccionadas = [], orden = null) {
  if (cotizacion.estado !== 'ACEPTADA') return 'La cotización debe estar aceptada.';
  if (cotizacion.orden_trabajo_aplicada) return 'Esta cotización ya está incorporada a una OT.';
  if (orden && !['PENDIENTE', 'EN_ESPERA', 'EN_PROCESO'].includes(orden.estado)) {
    return 'El estado de la OT no permite agregar cotizaciones.';
  }
  if (cotizacion.errorVisita) return 'No se pudo verificar la visita. Vuelve a cargar las cotizaciones.';
  const destino = cotizacion.orden_trabajo_destino_id;
  if (orden) {
    if (destino && destino !== orden.id) return 'La cotización está vinculada a otra OT.';
    if (!cotizacion.es_convertible && !(cotizacion.es_incorporable && destino === orden.id)) {
      return 'La cotización no está disponible para incorporación.';
    }
  } else if (!cotizacion.es_convertible || destino) {
    return 'La cotización corresponde a una OT existente.';
  }
  const referencia = orden || seleccionadas[0];
  if (referencia && ['empresa', 'sucursal', 'cliente', 'vehiculo'].some(
    (campo) => idDocumento(cotizacion[campo]) !== idDocumento(referencia[campo]),
  )) return 'Debe coincidir la empresa, el taller, el cliente y el vehículo.';
  if (orden) {
    const visitas = (orden.recepciones || []).map((r) => `recepcion:${idDocumento(r)}`);
    if (orden.inspeccion?.id) visitas.push(`inspeccion:${orden.inspeccion.id}`);
    if (cotizacion.visita && !visitas.includes(cotizacion.visita)) return 'La cotización corresponde a otra visita.';
  } else {
    const visita = seleccionadas.find((c) => c.visita)?.visita;
    if (visita && cotizacion.visita && visita !== cotizacion.visita) return 'Selecciona cotizaciones de la misma visita.';
  }
  return '';
}

// Los importes de la API tienen dos decimales. Sumar centavos evita errores de coma flotante.
export function totalCotizaciones(cotizaciones) {
  return cotizaciones.reduce((total, c) => total + Math.round(Number(c.total || 0) * 100), 0) / 100;
}
