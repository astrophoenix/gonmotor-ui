import { request } from '../../../shared/services/httpClient';

export function listarAuditoria(filtros, page, signal) {
  const params = new URLSearchParams({ page: String(page) });
  Object.entries(filtros).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/api/auditoria/?${params}`, { signal });
}
