import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/pagos/';

export const pagosService = {
  /** Todos los movimientos (pagos, devoluciones y anulados) de una orden. */
  listarDeOrden(ordenId) {
    const params = new URLSearchParams({ orden: ordenId, page_size: '100' });
    return request(`${ENDPOINT}?${params.toString()}`);
  },

  /** `payload`: { orden_trabajo, tipo: 'PAGO' | 'DEVOLUCION', forma_pago, monto, referencia?, observacion? } */
  registrar(payload) {
    return request(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Pagos y devoluciones de todas las órdenes de un cliente (los más recientes primero). */
  listarDeCliente(clienteId, { page = 1 } = {}) {
    const params = new URLSearchParams({ cliente: clienteId, page: String(page) });
    return request(`${ENDPOINT}?${params.toString()}`);
  },

  /** Órdenes entregadas con saldo. Filtros: search, cliente, sucursal, ordering, page. */
  cuentasPorCobrar({ page = 1, signal, ...filtros } = {}) {
    const params = new URLSearchParams({ page: String(page) });
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor);
    });
    return request(`${ENDPOINT}cuentas-por-cobrar/?${params.toString()}`, { signal });
  },

  /** Recordatorio de saldo al cliente. `payload`: { canal: 'whatsapp' | 'correo' } */
  recordarSaldo(ordenId, payload) {
    return request(`${ENDPOINT}cuentas-por-cobrar/${encodeURIComponent(ordenId)}/recordar/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Excel de pagos con los filtros del listado (fecha_desde, fecha_hasta, tipo, forma_pago, anulado, sucursal). */
  exportarExcel(filtros = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor);
    });
    return request(`${ENDPOINT}export-excel/?${params.toString()}`, { responseType: 'blob' });
  },

  anular(id, motivo) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/anular/`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  },
};
