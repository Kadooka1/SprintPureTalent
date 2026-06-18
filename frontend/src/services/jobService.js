import api from './api';

export const jobService = {
  list(params = {}) {
    return api.get('/jobs', { params }).then(r => r.data.data);
  },

  get(id) {
    return api.get(`/jobs/${id}`).then(r => r.data.data);
  },

  apply(id) {
    return api.post(`/jobs/${id}/apply`).then(r => r.data.data);
  },

  getApplications() {
    return api.get('/candidate/applications').then(r => r.data.data);
  },

  getApplicationCount() {
    return api.get('/candidate/applications/count').then(r => r.data.data.total);
  },
};
