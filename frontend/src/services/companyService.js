import api from './api';

export const companyService = {
  getProfile() {
    return api.get('/company/profile').then(r => r.data.data);
  },

  updateProfile(data) {
    return api.put('/company/profile', data).then(r => r.data.data);
  },

  uploadLogo(file) {
    const form = new FormData();
    form.append('logo', file);
    return api.post('/company/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },

  listJobs(params = {}) {
    return api.get('/company/jobs', { params }).then(r => r.data.data);
  },

  createJob(data) {
    return api.post('/company/jobs', data).then(r => r.data.data);
  },

  getJob(id) {
    return api.get(`/company/jobs/${id}`).then(r => r.data.data);
  },

  updateJob(id, data) {
    return api.put(`/company/jobs/${id}`, data).then(r => r.data);
  },

  deleteJob(id) {
    return api.delete(`/company/jobs/${id}`).then(r => r.data);
  },

  getApplicants(jobId) {
    return api.get(`/company/jobs/${jobId}/applicants`).then(r => r.data.data);
  },

  getSkills() {
    return api.get('/company/skills').then(r => r.data.data);
  },

  getCandidateProfile(candidateId) {
    return api.get(`/company/candidates/${candidateId}`).then(r => r.data.data);
  },

  updateApplicationStatus(appId, status, notes = null) {
    return api.patch(`/company/applications/${appId}/status`, {
      status,
      company_notes: notes,
    }).then(r => r.data);
  },
};
