import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/configuracion/sucursales/';

export const talleresService = {
  listTalleres() {
    return request(ENDPOINT);
  },

  getTaller(id) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/`);
  },

  createTaller(payload) {
    return request(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTaller(id, payload) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteTaller(id) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },
};