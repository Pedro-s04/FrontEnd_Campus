import api from '../api/axiosInstance'

// ── AUTH ──────────────────────────────────────────────────────
export const authService = {
  login: ({ username, password }) => api.post('/auth/login', { username, password }),
}

// ── USUARIOS ─────────────────────────────────────────────────
export const usuariosService = {
  listar:  (params) => api.get('/usuarios', { params }),
  crear:   (data)   => api.post('/usuarios', data),
  editar:  (id, data) => api.patch(`/usuarios/${id}`, data),
  eliminar:(id)     => api.delete(`/usuarios/${id}`),
}

// ── ORGANIZACIÓN ─────────────────────────────────────────────
export const organizacionService = {
  obtenerArbol:  ()       => api.get('/organizacion'),
  listar:        ()       => api.get('/organizacion'),
  listarJuzgados:()       => api.get('/organizacion/juzgados'),
  crear:         (data)   => api.post('/organizacion', data),
  actualizar:    (tipo, id, data) => api.patch(`/organizacion/${tipo}/${id}`, data),
  modificar:     (tipo, id, data) => api.patch(`/organizacion/${tipo}/${id}`, data),
}

// ── HARDWARE ─────────────────────────────────────────────────
export const hardwareService = {
  listar:  (params) => api.get('/hardware', { params }),
  crear:   (data)   => api.post('/hardware', data),
  obtener: (id)     => api.get(`/hardware/${id}`),
  actualizar:(id, data) => api.patch(`/hardware/${id}`, data),
}

// ── SOFTWARE ─────────────────────────────────────────────────
export const softwareService = {
  listar:  (params) => api.get('/software', { params }),
  crear:   (data)   => api.post('/software', data),
  obtener: (id)     => api.get(`/software/${id}`),
  actualizar:(id, data) => api.patch(`/software/${id}`, data),
}

// ── CONTRATOS ────────────────────────────────────────────────
export const contratosService = {
  listar:  (params) => api.get('/contratos', { params }),
  crear:   (data)   => api.post('/contratos', data),
  obtener: (id)     => api.get(`/contratos/${id}`),
  actualizar:(id, data) => api.patch(`/contratos/${id}`, data),
}

// ── TICKETS ──────────────────────────────────────────────────
export const ticketsService = {
  listar:      (params)   => api.get('/tickets', { params }),
  crear:       (data)     => api.post('/tickets', data),
  obtener:     (id)       => api.get(`/tickets/${id}`),
  actualizar:  (id, data) => api.patch(`/tickets/${id}`, data),
  addBitacora: (id, data) => api.post(`/tickets/${id}/bitacora`, data),
}

// ── DASHBOARD ────────────────────────────────────────────────
export const dashboardService = {
  stats:            ()       => api.get('/dashboard/stats'),
  ticketsPorJuzgado:()       => api.get('/dashboard/tickets-por-juzgado'),
  contratosVencer:  (dias=90)=> api.get('/dashboard/contratos-por-vencer', { params: { dias } }),
}
