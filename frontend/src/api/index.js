import { api } from './client'

export const papersApi = {
  list: (params = {}) => api.get('/papers', { params }),
  getById: (id) => api.get(`/papers/${id}`),
}

export const profileApi = {
  get: () => api.get('/profile'),
  create: (data) => api.post('/profile', data),
  update: (data) => api.put('/profile', data),
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
  trigger: (secret) =>
    api.post('/agent/run', {}, { headers: { 'X-Agent-Secret': secret } }),
  status: () => api.get('/agent/status'),
}
