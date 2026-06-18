import api from './api';

export const adminService = {
  getDashboard() {
    return api.get('/admin/dashboard').then(r => r.data.data);
  },

  // Usuários
  getUsers(params = {}) {
    return api.get('/admin/users', { params }).then(r => r.data.data);
  },
  toggleUser(id) {
    return api.patch(`/admin/users/${id}/toggle`).then(r => r.data.data);
  },
  deleteUser(id) {
    return api.delete(`/admin/users/${id}`).then(r => r.data);
  },

  // Empresas
  getCompanies(params = {}) {
    return api.get('/admin/companies', { params }).then(r => r.data.data);
  },
  toggleCompanyVerified(id) {
    return api.patch(`/admin/companies/${id}/toggle-verify`).then(r => r.data.data);
  },

  // Vagas
  getJobs(params = {}) {
    return api.get('/admin/jobs', { params }).then(r => r.data.data);
  },
  moderateJob(id, status, admin_notes = '') {
    return api.patch(`/admin/jobs/${id}/moderate`, { status, admin_notes }).then(r => r.data.data);
  },
  deleteJob(id) {
    return api.delete(`/admin/jobs/${id}`).then(r => r.data);
  },

  // Certificados
  getCertificates(params = {}) {
    return api.get('/admin/certificates', { params }).then(r => r.data.data);
  },
  moderateCert(id, status, admin_notes = '') {
    return api.patch(`/admin/certificates/${id}/moderate`, { status, admin_notes }).then(r => r.data.data);
  },

  // Logs de IA
  getAiLogs(params = {}) {
    return api.get('/admin/ai-logs', { params }).then(r => r.data.data);
  },
  getAiLog(id) {
    return api.get(`/admin/ai-logs/${id}`).then(r => r.data.data);
  },
};
