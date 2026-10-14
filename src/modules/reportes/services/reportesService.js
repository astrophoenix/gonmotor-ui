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
