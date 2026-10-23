import { request } from '@/shared/services/httpClient';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      q.set(key, value);
    }
  });
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchRentabilidadTaller(params = {}) {
  return request(`/api/reportes/rentabilidad-taller/${buildQuery(params)}`);
}

export async function fetchRentabilidadEmpresa(params = {}) {
  return request(`/api/reportes/rentabilidad-empresa/${buildQuery(params)}`);
}

/** Resumen del dueño (RF-07). Params: fecha_desde, fecha_hasta, taller_id. */
export async function fetchResumenNegocio(params = {}) {
  return request(`/api/reportes/resumen/${buildQuery(params)}`);
}

export async function descargarResumenPdf(params = {}) {
  return request(`/api/reportes/resumen/exportar-pdf/${buildQuery(params)}`, { responseType: 'blob' });
}

export async function fetchProductividad(params = {}, options = {}) {
  return request(`/api/reportes/productividad/${buildQuery(params)}`, options);
}

export async function descargarResumenExcel(params = {}) {
  return request(`/api/reportes/resumen/export-excel/${buildQuery(params)}`, { responseType: 'blob' });
}
