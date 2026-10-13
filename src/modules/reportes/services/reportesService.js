import httpClient from '@/shared/services/httpClient';

export async function fetchRentabilidadTaller(params = {}) {
  const { data } = await httpClient.get('/api/reportes/rentabilidad-taller/', { params });
  return data;
}

export async function fetchRentabilidadEmpresa(params = {}) {
  const { data } = await httpClient.get('/api/reportes/rentabilidad-empresa/', { params });
  return data;
}
