import { http } from './http'

export const projectsApi = {
  list: () => http.get('/api/projects'),
  overview: () => http.get('/api/overview'),
  stats: (id) => http.get(`/api/projects/${id}/stats`),
  storeStats: (id) => http.get(`/api/projects/${id}/store-stats`),
  users: (id, { page = 1, q = '', segment = '' } = {}) =>
    http.get(`/api/projects/${id}/users`, { page, q, segment }),
  sendReset: (id, userId) => http.post(`/api/projects/${id}/users/${userId}/send-reset`),
  setTempPassword: (id, userId) => http.post(`/api/projects/${id}/users/${userId}/set-temp-password`),
  apkInfo: (id) => http.get(`/api/projects/${id}/apk`),
  uploadApk: (id, file, { version = '', notes = '' } = {}) => {
    const formData = new FormData()
    formData.append('apk', file)
    formData.append('version', version)
    formData.append('notes', notes)
    return http.postFormData(`/api/projects/${id}/apk`, formData)
  },
}
