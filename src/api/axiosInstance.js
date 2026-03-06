import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8081/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pj_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pj_token')
      localStorage.removeItem('pj_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
