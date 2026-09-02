import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/configuracion/empresa/';

export const empresaConfigService = {
  getEmpresa() {
    return request(ENDPOINT);
  },

  updateEmpresa(empresaId, payload) {
    return request(`${ENDPOINT}${encodeURIComponent(empresaId)}/`, {
      method: 'PATCH',
      body: payload, // FormData cuando incluye logo
    });
  },
};