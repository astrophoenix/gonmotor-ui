const ESTADOS_DISPLAY = {
  recepcion: {
    PENDIENTE: 'Pendiente',
    ACEPTADA: 'Aceptada',
    NO_ACEPTADA: 'Rechazada',
  },
  inspeccion: {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En proceso',
    FINALIZADA: 'Finalizada',
  },
  cotizacion: {
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada al cliente',
    ACEPTADA: 'Aceptada',
    RECHAZADA: 'Rechazada',
    VENCIDA: 'Vencida',
    CONVERTIDA: 'Convertida a orden',
  },
  orden: {
    INGRESADO: 'En recepción / diagnóstico',
    EN_PROCESO: 'En trabajo / ejecución',
    COMPLETADO: 'Trabajo listo',
    ENTREGADO: 'Entregado y cerrado',
    CANCELADO: 'Anulado / cancelado',
  },
};

export function estadoAState(entidad, estado) {
  if (!estado) return 'pending';
  switch (entidad) {
    case 'recepcion':
      return estado === 'ACEPTADA'
        ? 'completed'
        : estado === 'NO_ACEPTADA'
          ? 'rejected'
          : 'current';
    case 'inspeccion':
      return estado === 'FINALIZADA' ? 'completed' : 'current';
    case 'cotizacion':
      return estado === 'ACEPTADA' || estado === 'CONVERTIDA'
        ? 'completed'
        : estado === 'RECHAZADA' || estado === 'VENCIDA'
          ? 'rejected'
          : 'current';
    case 'orden':
      return estado === 'COMPLETADO' || estado === 'ENTREGADO'
        ? 'completed'
        : estado === 'CANCELADO'
          ? 'rejected'
          : 'current';
    default:
      return 'pending';
  }
}

export function estadoADisplay(entidad, estado) {
  if (!estado) return 'Pendiente';
  return (ESTADOS_DISPLAY[entidad] && ESTADOS_DISPLAY[entidad][estado]) || estado;
}

export const FLUJO_LABELS = {
  recepcion: 'Recepción',
  inspeccion: 'Inspección',
  cotizacion: 'Cotización',
  orden: 'Orden de Trabajo',
};

export const FLUJO_DETALLE_PATHS = {
  recepcion: '/crud/recepciones/ver/',
  inspeccion: '/crud/inspecciones/ver/',
  cotizacion: '/crud/cotizaciones/ver/',
  orden: '/crud/ordenes/ver/',
};

export function buildPaso({ entidad, estado, estadoDisplay, id, numero }) {
  const paso = {
    label: FLUJO_LABELS[entidad] || entidad,
    state: estadoAState(entidad, estado),
    status: estadoDisplay || estadoADisplay(entidad, estado),
  };
  const existe = id !== null && id !== undefined && id !== '';
  if (existe && numero) {
    paso.numero = numero;
    if (FLUJO_DETALLE_PATHS[entidad]) {
      paso.to = `${FLUJO_DETALLE_PATHS[entidad]}?id=${encodeURIComponent(id)}`;
    }
  }
  return paso;
}

export function buildPasosFlujo(pasos) {
  return pasos.map(buildPaso);
}