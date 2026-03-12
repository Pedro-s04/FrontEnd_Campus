import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services'
import { Spinner } from '../components'
import logoMesaJudicall from '../assets/logoMesaJudicall.png'

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

      const displayName = user.nombre || user.username || form.username
      Swal.fire({
        icon: 'success',
        title: 'Login exitoso',
        text: `Bienvenido ${displayName}`,
        iconColor: '#16a34a',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
          popup: 'pj-swal-modal',
          title: 'pj-swal-modal-title',
        },
      })

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
      {/* Background glow + reflections */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 15% 0%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%), radial-gradient(900px 500px at 100% 100%, rgba(59,130,196,0.18) 0%, rgba(59,130,196,0) 60%), linear-gradient(160deg, #0d2644 0%, #12355c 42%, #1a4a7a 100%)',
        }}
      />
      <div className="absolute -top-20 -left-28 w-80 h-80 bg-white/18 blur-3xl rounded-full" />
      <div className="absolute top-1/3 -right-24 w-72 h-72 bg-white/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[520px] h-28 bg-white/10 blur-2xl rounded-full" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-full flex justify-center">
            <img
              src={logoMesaJudicall}
              alt="Poder Judicial Soporte e Inventario"
              className="block w-[340px] max-w-full h-auto drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl px-9 py-11 min-h-[440px] flex flex-col justify-center">
          <h2 className="text-gray-900 text-xl font-semibold mb-6">Iniciar sesion</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Usuario</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className={`form-control h-11 text-base ${error ? 'error' : ''}`}
                placeholder="Ingrese su usuario"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-2">Contrasena</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className={`form-control h-11 text-base ${error ? 'error' : ''}`}
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
              className="btn btn-primary w-full justify-center h-11 text-base"
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
