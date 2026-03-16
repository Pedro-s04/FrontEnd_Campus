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
        </div>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  )
}
