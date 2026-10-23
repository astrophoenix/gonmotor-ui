import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/compras/';
const PAGOS = '/api/compras/pagos/';

function buildUrl(id) {
  return `${ENDPOINT}${encodeURIComponent(id)}/`;
}

export const comprasService = {
  /** Filtros: search, proveedor, estado, con_saldo, fecha_desde, fecha_hasta, taller_id. Trae `resumen` (por pagar). */
  list({ page = 1, signal, ...filtros } = {}) {
    const params = new URLSearchParams({ page: String(page) });
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '' && valor !== false) params.set(clave, valor);
    });
    return request(`${ENDPOINT}?${params.toString()}`, { signal });
  },

  getById(id) {
    return request(buildUrl(id));
  },

  /** `payload`: { proveedor, numero_factura, fecha, condicion, fecha_vencimiento?, forma_pago?, observaciones?, detalles: [...] } */
  create(payload) {
    return request(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
  },

  anular(id, motivo) {
    return request(`${buildUrl(id)}anular/`, { method: 'POST', body: JSON.stringify({ motivo }) });
  },

  /** `payload`: { compra, forma_pago, monto, referencia?, observacion? } */
  registrarPago(payload) {
    return request(PAGOS, { method: 'POST', body: JSON.stringify(payload) });
  },

  anularPago(id, motivo) {
    return request(`${PAGOS}${encodeURIComponent(id)}/anular/`, { method: 'POST', body: JSON.stringify({ motivo }) });
  },
};
