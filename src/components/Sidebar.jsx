import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { showToast } from './index'

const NavIcon = ({ d, viewBox = '0 0 24 24' }) => (
  <svg width="16" height="16" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  tickets: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
    </svg>
  ),
  hardware: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
    </svg>
  ),
  software: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
    </svg>
  ),
  contratos: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  organizacion: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/>
      <rect x="16" y="15" width="6" height="6" rx="1"/>
      <path d="M5 13v3a1 1 0 0 0 1 1h11"/><path d="M19 9v3"/>
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  usuarios: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

function SideNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="w-4 flex-shrink-0">{icon}</span>
      {label}
    </NavLink>
  )
}

function NavSection({ label, children }) {
  return (
    <div className="py-2.5 border-b border-white/[0.06]">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-4 pb-1 pt-2">
        {label}
      </div>
      {children}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout, isAdmin, isOperador } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    showToast('Sesion cerrada', 'success')
    navigate('/login')
  }

  const initials = user?.nombre
    ? user.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || 'US'

  return (
    <aside className="w-60 bg-pj-navy flex flex-col flex-shrink-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 pb-4 border-b border-white/[0.08]">
        <div className="w-9 h-9 bg-pj-mid rounded-md flex items-center justify-center mb-2.5 text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50 leading-snug">
          Poder Judicial
        </div>
        <div className="text-[13px] font-semibold text-white mt-0.5">
          Soporte e Inventario
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <NavSection label="Mesa de Ayuda">
          <SideNavItem to="/tickets"      icon={ICONS.tickets}    label="Tickets de Soporte" />
        </NavSection>

        <NavSection label="Inventario">
          <SideNavItem to="/hardware"     icon={ICONS.hardware}   label="Hardware" />
          {(isAdmin || isOperador) && (
            <SideNavItem to="/software"   icon={ICONS.software}   label="Software y Licencias" />
          )}
        </NavSection>

        <NavSection label="Gestion">
          {(isAdmin || isOperador) && (
            <SideNavItem to="/contratos"  icon={ICONS.contratos}  label="Contratos" />
          )}
          <SideNavItem to="/organizacion" icon={ICONS.organizacion} label="Organizacion" />
        </NavSection>

        {isAdmin && (
          <NavSection label="Administracion">
            <SideNavItem to="/usuarios"   icon={ICONS.usuarios}   label="Usuarios" />
            <SideNavItem to="/dashboard"  icon={ICONS.dashboard}  label="Dashboard" />
          </NavSection>
        )}
      </nav>

      {/* User bottom */}
      <div className="mt-auto px-4 py-3.5 border-t border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-pj-mid rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-white truncate">{user?.nombre || user?.username}</div>
            <div className="text-[11px] text-white/40">{user?.rol}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesion"
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            {ICONS.logout}
          </button>
        </div>
      </div>
    </aside>
  )
}
