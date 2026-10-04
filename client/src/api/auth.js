import { http } from './http'

export const authApi = {
  me: () => http.get('/api/auth/me'),
  login: (username, password) => http.post('/api/auth/login', { username, password }),
  logout: () => http.post('/api/auth/logout'),
}
