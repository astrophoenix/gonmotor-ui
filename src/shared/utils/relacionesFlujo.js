import { PASOS_FLUJO, RUTAS_FLUJO } from '../config/flujoPasos';

/**
 * Adaptadores de la columna "Relaciones" de los listados del flujo taller.
 *
 * Cada serializer expone la cadena con nombres distintos, así que aquí se
 * normalizan al mismo shape que consume `RelacionesFlujo.vue`:
 *
 *   { key, label, icon, color, numero, estado, url, extra }
 *
 *   - `numero`: número del documento; si falta, el chip se muestra como "No".
 *   - `url`:    enlace al detalle, o `null` si el documento no existe.
 *   - `extra`:  documentos adicionales del mismo tipo (se pinta como "+N").
 *
 * Módulos ya cubiertos: recepciones e inspecciones. Cotizaciones y órdenes
 * tienen sus datos expuestos en el backend; para incluirlos basta con añadir un
 * adaptador más con `paso()`.
 */

/** Construye un paso normalizado a partir de los datos de un documento. */
function paso(key, { id, numero, estado, extra = 0 }) {
  const config = PASOS_FLUJO[key];
  return {
    key,
    label: config.label,
    icon: config.icon,
    color: config.color,
    numero: numero || null,
    estado: estado || null,
    url: id ? RUTAS_FLUJO[key](id) : null,
    extra,
  };
}

/** Recepción: de dónde salieron las inspecciones, la cotización y la orden. */
export function relacionesDeRecepcion(item) {
  const inspecciones = item?.inspecciones || [];
  const cotizaciones = item?.cotizaciones_generadas || [];
  const inspeccion = inspecciones[0];
  const cotizacion = cotizaciones[0];
  return [
    paso('inspeccion', {
      id: inspeccion?.id,
      numero: inspeccion?.numero_inspeccion,
      estado: inspeccion?.estado_display,
      extra: Math.max(inspecciones.length - 1, 0),
    }),
    paso('cotizacion', {
      id: cotizacion?.id,
      numero: cotizacion?.numero_cotizacion,
      estado: cotizacion?.estado_display,
      extra: Math.max(cotizaciones.length - 1, 0),
    }),
    paso('orden', {
      id: item?.orden_trabajo,
      numero: item?.orden_trabajo_numero,
      estado: item?.orden_trabajo_estado_display,
    }),
  ];
}

/** Inspección: la recepción de la que salió, su cotización y su orden. */
export function relacionesDeInspeccion(item) {
  const recepcion = item?.recepcion;
  return [
    paso('recepcion', {
      id: recepcion?.id,
      numero: recepcion?.numero_recepcion,
      estado: recepcion?.estado_display,
    }),
    paso('cotizacion', {
      id: item?.cotizacion_id,
      numero: item?.cotizacion_numero,
      estado: item?.cotizacion_estado_display,
    }),
    paso('orden', {
      id: item?.orden_trabajo,
      numero: item?.orden_trabajo_numero,
      estado: item?.orden_trabajo_estado_display,
    }),
  ];
}

/** Cotización: la recepción/inspección de origen y la orden generada. */
export function relacionesDeCotizacion(item) {
  return [
    paso('recepcion', {
      id: item?.recepcion_origen,
      numero: item?.recepcion_numero,
      estado: item?.recepcion_estado_display,
    }),
    paso('inspeccion', {
      id: item?.inspeccion_origen,
      numero: item?.inspeccion_numero,
      estado: item?.inspeccion_estado_display,
    }),
    paso('orden', {
      id: item?.orden_generada_id ?? item?.orden_trabajo_origen,
      numero: item?.orden_generada_numero ?? item?.orden_trabajo_numero,
      estado: item?.orden_trabajo_estado_display,
    }),
  ];
}

/** Orden: la recepción/inspección y la cotización de la que surgió. */
export function relacionesDeOrden(item) {
  const recepcion = item?.recepciones?.[0];
  return [
    paso('recepcion', {
      id: recepcion?.id,
      numero: recepcion?.numero_recepcion,
      estado: item?.recepcion_estado_display,
    }),
    paso('inspeccion', {
      id: item?.inspeccion?.id,
      numero: item?.inspeccion?.numero_inspeccion,
      estado: item?.inspeccion_estado_display,
    }),
    paso('cotizacion', {
      id: item?.cotizacion_id,
      numero: item?.cotizacion_numero,
      estado: item?.cotizacion_estado_display,
    }),
  ];
}
