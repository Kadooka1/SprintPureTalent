import api from './api';

async function unwrap(promise) {
  const { data } = await promise;
  return data.data;
}

export const authService = {
  registerCandidate: (payload) =>
    unwrap(api.post('/auth/register/candidate', payload)),

  registerCompany: (payload) =>
    unwrap(api.post('/auth/register/company', payload)),

  login: (email, password) =>
    unwrap(api.post('/auth/login', { email, password })),

  logout: (refreshToken) =>
    api.post('/auth/logout', { refreshToken }),

  verifyEmail: (token) =>
    unwrap(api.get(`/auth/verify-email/${token}`)),

  forgotPassword: (email) =>
    unwrap(api.post('/auth/forgot-password', { email })),

  resetPassword: (token, password) =>
    unwrap(api.post(`/auth/reset-password/${token}`, { password })),
};
