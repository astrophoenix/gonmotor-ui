// servicios/authService.js
import { request } from '../../../shared/services/httpClient';

export const authService = {
  login(credentials) {
    return request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  selectCompany(payload) {
    return request('/api/auth/select-company/', {
      method: 'POST',
      body: JSON.stringify(payload), // envía { user_id, empresa_id }
    });
  },

  register(account) {
    return request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  },

  updateProfile(data) {
    const isForm = data instanceof FormData;
    return request('/api/auth/me/', {
      method: 'PATCH',
      body: isForm ? data : JSON.stringify(data),
    });
  },

  changePassword(data) {
    return request('/api/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};