import { CircleAlert, CircleCheck, CircleDashed, CircleDot, CircleSlash } from 'lucide-vue-next';

/** Formas de pago (apps/pagos/models.py → PagoOrden.FormaPago). */
export const FORMAS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTRO', label: 'Otro' },
];

/** Formas de pago que exigen número de comprobante (misma regla del backend). */
export const FORMAS_CON_REFERENCIA = ['TRANSFERENCIA', 'CHEQUE'];

/**
 * Estado de pago de la orden (apps/pagos/services.py → EstadoPago), calculado
 * por el backend a partir del total y lo pagado neto.
 */
export const ESTADOS_PAGO = {
  PENDIENTE: { icon: CircleDashed, label: 'Pendiente de pago', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  PARCIAL: { icon: CircleDot, label: 'Pago parcial', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  PAGADO: { icon: CircleCheck, label: 'Pagado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  // Orden anulada: no se cobra.
  SIN_COBRO: { icon: CircleSlash, label: 'Sin cobro', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

/** Estados ofrecidos en el filtro del listado de órdenes. */
export const ESTADOS_PAGO_FILTRABLE = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'SIN_COBRO'];

export function getEstadoPago(estado, estadoDisplay) {
  const config = ESTADOS_PAGO[estado] || ESTADOS_PAGO.PENDIENTE;
  return { ...config, label: estadoDisplay || config.label };
}

function dinero(valor) {
  return `$ ${Number(valor || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Confirmación para entregar una orden con saldo pendiente (`ConfirmModal`).
 * Al confirmarla se envía `entrega_a_credito: true` y el backend registra el
 * saldo y quién la autorizó.
 */
export function transicionEntregaCredito(saldo) {
  return {
    estado: 'ENTREGADO',
    credito: true,
    title: 'Entregar a crédito',
    message: `La orden tiene un saldo pendiente de ${dinero(saldo)}. Si la entregas ahora, queda como entrega a crédito autorizada por ti. ¿Deseas continuar?`,
    icon: CircleAlert,
    iconClass: 'text-amber-600 dark:text-amber-400',
    confirmText: 'Sí, entregar a crédito',
    confirmingText: 'Registrando...',
    variant: 'primary',
    exito: `Entrega registrada a crédito. Saldo pendiente: ${dinero(saldo)}.`,
  };
}

/** Saldo que devuelve el backend al rechazar una entrega sin confirmar (o `null`). */
export function saldoDeEntregaRechazada(error) {
  if (!error?.data?.entrega_a_credito) return null;
  return [].concat(error.data.saldo ?? 0)[0];
}
