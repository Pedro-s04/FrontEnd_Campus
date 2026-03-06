import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services'
import { Spinner } from '../components'

export default function Login() {
  const { login, token } = useAuth()
  const navigate = useNavigate()

  const [form,    setForm]    = useState({ username: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/tickets" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Ingrese usuario y contrasena.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authService.login(form)
      const { data } = res.data || {}
      const { token: jwt, user } = data || {}

      if (!jwt || !user) {
        throw new Error('Respuesta de login invalida.')
      }

      login(jwt, user)
      navigate('/tickets', { replace: true })
    } catch (err) {
      const apiMessage = err.response?.data?.error?.message
      const validationMessage = err.response?.data?.error?.details?.[0]?.message
      setError(apiMessage || validationMessage || err.message || 'Credenciales incorrectas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pj-navy flex items-center justify-center p-4">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #3b82c4 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1a4a7a 0%, transparent 50%)' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-pj-mid rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Poder Judicial</p>
          <h1 className="text-white text-xl font-semibold mt-1">Soporte e Inventario</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl p-7">
          <h2 className="text-gray-900 text-base font-semibold mb-5">Iniciar sesion</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Usuario</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className={`form-control ${error ? 'error' : ''}`}
                placeholder="Ingrese su usuario"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Contrasena</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className={`form-control ${error ? 'error' : ''}`}
                placeholder="Ingrese su contrasena"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-danger-light border border-red-200 text-danger text-xs rounded-md px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center h-9"
            >
              {loading ? <Spinner size={4} /> : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-5">
          Sistema de Soporte e Inventario v2.0
        </p>
      </div>
    </div>
  )
}
