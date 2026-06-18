import api from './api';

export const certificateService = {
  upload(file) {
    const fd = new FormData();
    fd.append('certificate', file);
    return api.post('/candidate/certificates', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },

  list() {
    return api.get('/candidate/certificates').then(r => r.data.data);
  },

  remove(id) {
    return api.delete(`/candidate/certificates/${id}`).then(r => r.data);
  },

  getSkills() {
    return api.get('/candidate/skills').then(r => r.data.data);
  },

  reprocessSkills(id) {
    return api.post(`/candidate/certificates/${id}/reprocess-skills`).then(r => r.data.data);
  },
};
