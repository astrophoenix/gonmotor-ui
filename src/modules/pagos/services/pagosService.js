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

  /** PDF del recibo de un movimiento: `{ blob, contentDisposition }`. */
  descargarRecibo(id) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/recibo/`, { responseType: 'blob' });
  },

  /** Confirmación del movimiento al cliente. `payload`: { canal: 'whatsapp' | 'correo' } */
  enviarRecibo(id, payload) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/enviar-recibo/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Factura o nota de venta emitida fuera del sistema; número vacío la quita.
   * `payload`: { tipo_comprobante, numero_factura, fecha_factura }. Devuelve la orden.
   */
  registrarComprobante(ordenId, payload) {
    return request(`/api/ordenes/ordenes-trabajo/${encodeURIComponent(ordenId)}/factura/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  anular(id, motivo) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/anular/`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  },
};
