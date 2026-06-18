import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Injeta o access token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pt_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Se receber 401, tenta renovar o access token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('pt_refresh_token');
        if (!refreshToken) throw new Error('Sem refresh token');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('pt_access_token',  data.data.accessToken);
        localStorage.setItem('pt_refresh_token', data.data.refreshToken);

        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
