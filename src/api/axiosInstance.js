import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

let redirectingToLogin = false

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
      const requestUrl = error.config?.url || ''
      const isLoginRequest = requestUrl.includes('/auth/login')
      const hasStoredSession = Boolean(localStorage.getItem('pj_token'))
      const isInLoginRoute = window.location.pathname === '/login'

      // Avoid redirect loops for auth/login failures or unauthenticated public flows.
      if (!isLoginRequest && hasStoredSession) {
        localStorage.removeItem('pj_token')
        localStorage.removeItem('pj_user')

        if (!isInLoginRoute && !redirectingToLogin) {
          redirectingToLogin = true
          window.location.assign('/login')
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
