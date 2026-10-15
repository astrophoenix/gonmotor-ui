import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/core/dashboard-v2/';

export const dashboardService = {
  get({ fechaDesde, fechaHasta, sucursal, diasEnTaller, signal } = {}) {
    const params = new URLSearchParams();
    if (fechaDesde) params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params.set('fecha_hasta', fechaHasta);
    if (sucursal) params.set('sucursal', String(sucursal));
    if (diasEnTaller) params.set('dias_en_taller', String(diasEnTaller));

    const query = params.toString();
    return request(`${ENDPOINT}${query ? `?${query}` : ''}`, { signal });
  },
};
