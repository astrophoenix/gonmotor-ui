import { Ban, CircleCheck, CircleDot } from 'lucide-vue-next';

/** Condición de pago de la compra (apps/compras/models.py → Compra.Condicion). */
export const CONDICIONES_COMPRA = [
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO', label: 'Crédito' },
];

/**
 * Estado de la compra combinado con su saldo: una compra registrada está
 * «Pagada» o «Por pagar»; una anulada, «Anulada». Lo usa `EstadoCompraBadge`.
 */
export const ESTADOS_COMPRA = {
  PAGADA: { label: 'Pagada', icon: CircleCheck, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  POR_PAGAR: { label: 'Por pagar', icon: CircleDot, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  ANULADA: { label: 'Anulada', icon: Ban, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

export function getEstadoCompra(compra) {
  if (compra?.estado === 'ANULADA') return ESTADOS_COMPRA.ANULADA;
  return Number(compra?.saldo) > 0 ? ESTADOS_COMPRA.POR_PAGAR : ESTADOS_COMPRA.PAGADA;
}

/** IVA de las líneas de compra (el backend acepta 0 % o 15 %). */
export const IVA_COMPRA = [
  { value: '0.15', label: '15 %' },
  { value: '0', label: '0 %' },
];
