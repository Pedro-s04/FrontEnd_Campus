import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

function normalizeRole(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^ROLE_/i, '')
    .toUpperCase()
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('pj_token')
    const storedUser  = localStorage.getItem('pj_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  function login(tokenValue, userData) {
    localStorage.setItem('pj_token', tokenValue)
    localStorage.setItem('pj_user', JSON.stringify(userData))
    setToken(tokenValue)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('pj_token')
    localStorage.removeItem('pj_user')
    setToken(null)
    setUser(null)
  }

  const rol = user?.rol || ''
  const rolNormalized = normalizeRole(rol)
  const isAdmin    = rolNormalized === 'ADMINISTRADOR'
  const isOperador = rolNormalized === 'OPERADOR'
  const isTecnico  = rolNormalized === 'TECNICO'

  function hasAnyRole(roles = []) {
    return roles.map(normalizeRole).includes(rolNormalized)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, rol, rolNormalized, isAdmin, isOperador, isTecnico, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
