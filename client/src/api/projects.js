import { http } from './http'

export const projectsApi = {
  list: () => http.get('/api/projects'),
  overview: () => http.get('/api/overview'),
  stats: (id) => http.get(`/api/projects/${id}/stats`),
  storeStats: (id) => http.get(`/api/projects/${id}/store-stats`),
  users: (id, { page = 1, q = '' } = {}) => http.get(`/api/projects/${id}/users`, { page, q }),
  sendReset: (id, userId) => http.post(`/api/projects/${id}/users/${userId}/send-reset`),
  setTempPassword: (id, userId) => http.post(`/api/projects/${id}/users/${userId}/set-temp-password`),
}
