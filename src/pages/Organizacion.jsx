import { useEffect, useState } from 'react'
import { organizacionService } from '../services'
import { useAuth } from '../context/AuthContext'
import { PageHeader, EmptyState, Spinner } from '../components'

function OrgNode({ node, level = 0 }) {
  const [open, setOpen] = useState(true)

  const children = node.children || node.distritos || node.juzgados || []
  const hasChildren = children.length > 0

  const icons = [
    // Circunscripcion
    <svg className="w-4 h-4 text-pj-mid flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/>
    </svg>,
    // Distrito
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>,
    // Juzgado
    <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>,
  ]

  const icon = icons[Math.min(level, 2)]

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors select-none"
        onClick={() => setOpen(o => !o)}
      >
        {hasChildren && (
          <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        )}
        {!hasChildren && <div className="w-3" />}
        {icon}
        <span className={`text-sm ${level === 0 ? 'font-semibold text-gray-800' : level === 1 ? 'font-medium text-gray-700' : 'text-gray-600'}`}>
          {node.nombre}
        </span>
        {hasChildren && (
          <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {children.length}
          </span>
        )}
        {node.ciudad && <span className="text-xs text-gray-400 ml-1">— {node.ciudad}</span>}
      </div>
      {open && hasChildren && (
        <div className="pl-5 ml-3 border-l-2 border-gray-100">
          {children.map((child, i) => <OrgNode key={child.id || i} node={child} level={level + 1} />)}
        </div>
      )}
    </div>
  )
}

export default function Organizacion() {
  const { isAdmin } = useAuth()
  const [tree,    setTree]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    organizacionService.listar()
      .then(res => {
        const d = res.data?.data
        setTree(Array.isArray(d) ? d : d ? [d] : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader
        title="Organizacion"
        subtitle="Estructura jerarquica del Poder Judicial"
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={8} /></div>
        ) : tree.length === 0 ? (
          <EmptyState title="Sin datos" text="No se encontro estructura organizacional." />
        ) : (
          <div className="space-y-0.5">
            {tree.map((node, i) => <OrgNode key={node.id || i} node={node} level={0} />)}
          </div>
        )}
      </div>
    </div>
  )
}
