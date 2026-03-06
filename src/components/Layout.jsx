import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const BREADCRUMBS = {
  '/tickets':       ['Mesa de Ayuda',  'Tickets de Soporte'],
  '/hardware':      ['Inventario',     'Hardware'],
  '/software':      ['Inventario',     'Software y Licencias'],
  '/contratos':     ['Gestion',        'Contratos'],
  '/organizacion':  ['Gestion',        'Organizacion'],
  '/usuarios':      ['Administracion', 'Usuarios'],
  '/dashboard':     ['Administracion', 'Dashboard'],
}

export default function Layout({ children }) {
  const location = useLocation()
  const crumbs   = BREADCRUMBS[location.pathname] || ['Sistema', 'Inicio']

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>{crumbs[0]}</span>
            <span className="text-gray-300">›</span>
            <span className="font-medium text-gray-800">{crumbs[1]}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="w-8 h-8 border border-gray-200 rounded-md bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors" title="Notificaciones">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button className="w-8 h-8 border border-gray-200 rounded-md bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors" title="Ayuda">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
              </svg>
            </button>
          </div>
        </div>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  )
}
