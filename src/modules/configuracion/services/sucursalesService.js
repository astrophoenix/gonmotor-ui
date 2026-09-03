import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/configuracion/sucursales/';

export const sucursalesService = {
  listSucursales() {
    return request(ENDPOINT);
  },

  createSucursal(payload) {
    return request(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateSucursal(id, payload) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteSucursal(id) {
    return request(`${ENDPOINT}${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  },
};