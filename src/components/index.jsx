import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useAuth } from '../context/AuthContext'

// ── BADGE ────────────────────────────────────────────────────
export function Badge({ value, label }) {
  const cls = `badge badge-${(value || '').replace(/ /g, '_').toLowerCase()}`
  return <span className={cls}>{label || value}</span>
}

// ── SPINNER ──────────────────────────────────────────────────
export function Spinner({ size = 5 }) {
  return (
    <div className={`inline-block w-${size} h-${size} border-2 border-gray-200 border-t-pj-mid rounded-full animate-spin`} />
  )
}

// ── LOADING SCREEN ───────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={8} />
        <span className="text-sm text-gray-500">Cargando...</span>
      </div>
    </div>
  )
}

// ── EMPTY STATE ──────────────────────────────────────────────
export function EmptyState({ title = 'Sin resultados', text = 'No se encontraron datos.' }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3 text-gray-300">
        <svg className="inline w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
        </svg>
      </div>
      <div className="text-base font-medium text-gray-500 mb-1">{title}</div>
      <div className="text-sm">{text}</div>
    </div>
  )
}

// ── MODAL ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, wide = false }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`bg-white rounded-xl ${wide ? 'w-[680px]' : 'w-[520px]'} max-w-[95vw] max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-base font-semibold text-gray-900">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-gray-200 flex justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FORM GROUP ───────────────────────────────────────────────
export function FormGroup({ label, required, error, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}

// ── PROTECTED ROUTE ──────────────────────────────────────────
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading, hasAnyRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const hasSession = Boolean(token && user)
  const hasRoleAccess = !allowedRoles || hasAnyRole(allowedRoles)

  useEffect(() => {
    if (loading) return

    if (!hasSession) {
      navigate('/login', { replace: true, state: { from: location } })
      return
    }

    if (!hasRoleAccess) {
      navigate('/tickets', { replace: true })
    }
  }, [loading, hasSession, hasRoleAccess, navigate, location])

  if (loading) return <LoadingScreen />
  if (!hasSession) return null
  if (!hasRoleAccess) return null

  return children
}

export function PublicRoute({ children }) {
  const { user, token, loading } = useAuth()
  const navigate = useNavigate()

  const hasSession = Boolean(token && user)

  useEffect(() => {
    if (!loading && hasSession) {
      navigate('/tickets', { replace: true })
    }
  }, [loading, hasSession, navigate])

  if (loading) return <LoadingScreen />
  if (hasSession) return null

  return children
}

// ── PAGE HEADER ──────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── STAT CARD ────────────────────────────────────────────────
export function StatCard({ label, value, sub, variant }) {
  const valueColor = {
    danger:  'text-danger',
    warning: 'text-warning',
    success: 'text-success',
  }[variant] || 'text-gray-900'

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 leading-none ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

// ── SEARCH INPUT ─────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="relative">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
    </div>
  )
}

// ── TOAST CONTAINER ──────────────────────────────────────────
let toastCallback = null

export function setToastCallback(fn) {
  toastCallback = fn
}

export function showToast(message, type = 'success') {
  if (!message) return
  if (toastCallback) {
    toastCallback(message, type)
    return
  }

  const icon = ['success', 'error', 'warning', 'info', 'question'].includes(type) ? type : 'info'
  const iconColorMap = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#0891b2',
    question: '#2563a8',
  }

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title: message,
    iconColor: iconColorMap[icon],
    showConfirmButton: false,
    timer: icon === 'error' ? 4200 : 3000,
    timerProgressBar: true,
    customClass: {
      popup: `pj-swal-toast pj-swal-${icon}`,
      title: 'pj-swal-title',
      timerProgressBar: 'pj-swal-progress',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    },
  })
}

export async function confirmDialog({
  title = 'Confirmar accion',
  text = 'Esta accion no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon = 'warning',
} = {}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    iconColor: icon === 'warning' ? '#d97706' : '#2563a8',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'pj-swal-modal',
      title: 'pj-swal-modal-title',
      confirmButton: 'pj-swal-btn pj-swal-btn-confirm',
      cancelButton: 'pj-swal-btn pj-swal-btn-cancel',
    },
    buttonsStyling: false,
  })

  return Boolean(result.isConfirmed)
}

export function ToastContainer({ toasts, onRemove }) {
  return null
}
