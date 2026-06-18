import api from './api';

function unwrap(res) {
  return res.data.data;
}

export const candidateService = {
  getProfile() {
    return api.get('/candidate/profile').then(unwrap);
  },

  updateProfile(data) {
    return api.put('/candidate/profile', data).then(unwrap);
  },

  uploadAvatar(file) {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/candidate/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },

  addEducation(data) {
    return api.post('/candidate/education', data).then(unwrap);
  },

  updateEducation(id, data) {
    return api.put(`/candidate/education/${id}`, data).then(unwrap);
  },

  deleteEducation(id) {
    return api.delete(`/candidate/education/${id}`).then(unwrap);
  },

  addExperience(data) {
    return api.post('/candidate/experience', data).then(unwrap);
  },

  updateExperience(id, data) {
    return api.put(`/candidate/experience/${id}`, data).then(unwrap);
  },

  deleteExperience(id) {
    return api.delete(`/candidate/experience/${id}`).then(unwrap);
  },

  deleteAccount() {
    return api.delete('/candidate/account').then(unwrap);
  },
};
