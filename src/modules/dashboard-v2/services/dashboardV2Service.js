import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/core/dashboard-v2/';

export const dashboardV2Service = {
  get({ fechaDesde, fechaHasta, sucursal, signal } = {}) {
    const params = new URLSearchParams();
    if (fechaDesde) params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params.set('fecha_hasta', fechaHasta);
    if (sucursal) params.set('sucursal', String(sucursal));

    const query = params.toString();
    return request(`${ENDPOINT}${query ? `?${query}` : ''}`, { signal });
  },
};
