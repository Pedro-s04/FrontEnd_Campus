import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

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
  const isAdmin    = rol === 'ADMINISTRADOR'
  const isOperador = rol === 'OPERADOR'
  const isTecnico  = rol === 'TECNICO'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, rol, isAdmin, isOperador, isTecnico }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
