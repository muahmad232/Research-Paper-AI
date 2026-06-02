import { api } from './client'

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  guestLogin: () => api.post('/auth/guest'),
  me: () => api.get('/auth/me'),
}

export const papersApi = {
  list: (params = {}) => api.get('/papers', { params }),
  getById: (id) => api.get(`/papers/${id}`),
  analyze: (id) => api.post(`/papers/${id}/analyze`),
}

export const profileApi = {
  get: () => api.get('/profile'),
  upsert: (data) => api.put('/profile', data),
}

export const gapsApi = {
  list: () => api.get('/gaps'),
}

export const escalationsApi = {
  list: () => api.get('/escalations'),
  decide: (id, decision) => api.post(`/escalations/${id}/decide`, { decision }),
}

export const digestApi = {
  latest: () => api.get('/digest/latest'),
  history: () => api.get('/digest/history'),
}

export const agentApi = {
  trigger: () => api.post('/agent/run'),
  status: () => api.get('/agent/status'),
}
