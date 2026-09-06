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