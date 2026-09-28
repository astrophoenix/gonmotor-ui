// Utilidades de impuestos por línea: descuento e IVA (15% / 0%) por item,
// en línea con el desglose fiscal del SRI que calcula el backend.

export const IVA_DEFECTO = '0.1500';

export const IVA_OPCIONES = [
  { value: '0.1500', label: '15%' },
  { value: '0.0000', label: '0%' },
];

export function round2(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export function normalizarIva(valor) {
  const numero = Number(valor);
  if (numero !== 0 && !numero) return IVA_DEFECTO;
  return numero.toFixed(4);
}

export function normalizarDescuento(valor) {
  const numero = Number(valor);
  if (!numero || numero < 0) return '0.00';
  return numero.toFixed(2);
}

export function netoLinea(bruto, descuento) {
  return round2(Math.max(0, (Number(bruto) || 0) - (Number(descuento) || 0)));
}

export function ivaLinea(neto, ivaPorcentaje) {
  return round2((Number(neto) || 0) * (Number(ivaPorcentaje) || 0));
}
