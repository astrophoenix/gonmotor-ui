import { request } from '../../../shared/services/httpClient';

const ENDPOINT = '/api/core/dashboard/';

export const dashboardService = {
  get({ signal } = {}) {
    return request(ENDPOINT, { signal });
  },
};
