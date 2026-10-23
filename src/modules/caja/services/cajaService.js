import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/caja/';

function query(params = {}) {
  const busqueda = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') busqueda.set(clave, valor);
  });
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
}

export const cajaService = {
  /** Caja del taller (`taller` solo con «Todos los talleres»): sesión abierta y último cierre. */
  estado({ taller } = {}) {
    return request(`${ENDPOINT}estado/${query({ taller })}`);
  },

  abrir({ taller, monto_inicial }) {
    return request(`${ENDPOINT}abrir/`, {
      method: 'POST',
      body: JSON.stringify({ taller: taller || '', monto_inicial }),
    });
  },

  /** Historial de jornadas. Filtros: taller, estado, fecha_desde, fecha_hasta, page. */
  sesiones({ page = 1, ...filtros } = {}) {
    return request(`${ENDPOINT}sesiones/${query({ page, ...filtros })}`);
  },

  cerrar(id, { efectivo_contado, observacion }) {
    return request(`${ENDPOINT}sesiones/${encodeURIComponent(id)}/cerrar/`, {
      method: 'POST',
      body: JSON.stringify({ efectivo_contado, observacion }),
    });
  },

  reabrir(id, motivo) {
    return request(`${ENDPOINT}sesiones/${encodeURIComponent(id)}/reabrir/`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  },

  /** `payload`: { tipo: 'INGRESO' | 'EGRESO', monto, motivo, categoria_gasto? } */
  registrarMovimiento(sesionId, payload) {
    return request(`${ENDPOINT}sesiones/${encodeURIComponent(sesionId)}/movimientos/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  anularMovimiento(id, motivo) {
    return request(`${ENDPOINT}movimientos/${encodeURIComponent(id)}/anular/`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  },

  pdf(sesionId) {
    return request(`${ENDPOINT}sesiones/${encodeURIComponent(sesionId)}/pdf/`, { responseType: 'blob' });
  },
};
