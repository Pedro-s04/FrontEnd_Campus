import { useEffect, useMemo, useState } from 'react'
import { organizacionService } from '../services'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { PageHeader, EmptyState, Spinner, Modal, FormGroup, showToast, confirmDialog } from '../components'

const TYPE_BY_LEVEL = ['circunscripcion', 'distrito', 'juzgado']
const EMPTY_FORM = { tipo: 'juzgado', nombre: '', ciudad: '', parentId: '' }

function getChildren(node) {
  return node.children || node.distritos || node.juzgados || []
}

function normalizeTreeData(data) {
  return Array.isArray(data) ? data : data ? [data] : []
}

function flattenTree(nodes) {
  const flat = []

  function walk(node, level = 0, parent = null, path = '') {
    const nombre = node.nombre || ''
    const tipo = TYPE_BY_LEVEL[Math.min(level, 2)]
    const currentPath = path ? `${path} / ${nombre}` : nombre
    const current = {
      id: node.id,
      nombre,
      ciudad: node.ciudad || '',
      tipo,
      level,
      parentId: parent?.id || null,
      path: currentPath,
    }

    flat.push(current)
    getChildren(node).forEach((child) => walk(child, level + 1, current, currentPath))
  }

  nodes.forEach((node) => walk(node, 0, null, ''))
  return flat
}

function validateForm(form) {
  const e = {}
  if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (form.tipo !== 'circunscripcion' && !form.parentId) e.parentId = 'Debe seleccionar un nodo padre.'
  return e
}

function buildPayload(form) {
  const parentId = form.parentId ? Number(form.parentId) : undefined
  const payload = {
    tipo: form.tipo,
    nombre: form.nombre.trim(),
    ciudad: form.ciudad.trim() || undefined,
  }

  if (form.tipo !== 'circunscripcion' && parentId) {
    payload.parentId = parentId
    payload.padreId = parentId
  }

  if (form.tipo === 'distrito' && parentId) payload.circunscripcionId = parentId
  if (form.tipo === 'juzgado' && parentId) payload.distritoId = parentId

  return payload
}

function OrgNode({ node, level = 0, parent = null, canWrite = false, onEdit }) {
  const [open, setOpen] = useState(true)

  const children = getChildren(node)
  const hasChildren = children.length > 0
  const tipo = TYPE_BY_LEVEL[Math.min(level, 2)]

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
        {node.ciudad && <span className="text-xs text-gray-400 ml-1">— {node.ciudad}</span>}

        <div className="ml-auto flex items-center gap-2">
          {hasChildren && (
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {children.length}
            </span>
          )}
          {canWrite && node.id && (
            <button
              type="button"
              className="btn btn-edit btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.({
                  id: node.id,
                  tipo,
                  nombre: node.nombre || '',
                  ciudad: node.ciudad || '',
                  parentId: parent?.id || '',
                })
              }}
            >
              Editar
            </button>
          )}
        </div>
      </div>
      {open && hasChildren && (
        <div className="pl-5 ml-3 border-l-2 border-gray-100">
          {children.map((child, i) => (
            <OrgNode
              key={child.id || i}
              node={child}
              level={level + 1}
              parent={node}
              canWrite={canWrite}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Organizacion() {
  const { isAdmin } = useAuth()
  const { run, loading: saving } = useAsync()
  const canWrite = isAdmin

  const [tree,    setTree]    = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState({ id: null, tipo: '', nombre: '', ciudad: '', parentId: '' })
  const [createErrors, setCreateErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})

  const flatNodes = useMemo(() => flattenTree(tree), [tree])
  const circunscripciones = useMemo(
    () => flatNodes.filter((n) => n.tipo === 'circunscripcion'),
    [flatNodes]
  )
  const distritos = useMemo(
    () => flatNodes.filter((n) => n.tipo === 'distrito'),
    [flatNodes]
  )

  async function loadTree(showLoader = true) {
    if (showLoader) setLoading(true)
    try {
      const res = await organizacionService.obtenerArbol()
      setTree(normalizeTreeData(res.data?.data))
    } catch (_) {
      showToast('Error al cargar la estructura organizacional.', 'error')
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    loadTree()
  }, [])

  function openEdit(node) {
    setEditForm({
      id: node.id,
      tipo: node.tipo,
      nombre: node.nombre || '',
      ciudad: node.ciudad || '',
      parentId: node.parentId ? String(node.parentId) : '',
    })
    setEditErrors({})
    setShowEdit(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validateForm(createForm)
    if (Object.keys(errs).length) {
      setCreateErrors(errs)
      return
    }

    setCreateErrors({})
    try {
      await run(organizacionService.crear(buildPayload(createForm)))
      showToast('Nodo creado correctamente.', 'success')
      setShowCreate(false)
      setCreateForm(EMPTY_FORM)
      await loadTree(false)
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Error al crear nodo'
      showToast(msg, 'error')
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const errs = validateForm(editForm)
    if (Object.keys(errs).length) {
      setEditErrors(errs)
      return
    }

    setEditErrors({})

    const confirmed = await confirmDialog({
      title: 'Confirmar cambios',
      text: 'Se actualizara la informacion del nodo.',
      confirmText: 'Si, guardar',
      cancelText: 'Cancelar',
      icon: 'warning',
    })
    if (!confirmed) return

    try {
      await run(organizacionService.actualizar(editForm.tipo, editForm.id, buildPayload(editForm)))
      showToast('Nodo actualizado correctamente.', 'success')
      setShowEdit(false)
      await loadTree(false)
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Error al actualizar nodo'
      showToast(msg, 'error')
    }
  }

  function renderParentField(form, setForm, errors) {
    if (form.tipo === 'circunscripcion') return null

    if (form.tipo === 'distrito') {
      return (
        <FormGroup label="Circunscripcion padre" required error={errors.parentId}>
          <select
            className={`form-control ${errors.parentId ? 'error' : ''}`}
            value={form.parentId}
            onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
          >
            <option value="">Seleccionar circunscripcion</option>
            {circunscripciones.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </FormGroup>
      )
    }

    return (
      <FormGroup label="Distrito padre" required error={errors.parentId}>
        <select
          className={`form-control ${errors.parentId ? 'error' : ''}`}
          value={form.parentId}
          onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
        >
          <option value="">Seleccionar distrito</option>
          {distritos.map((d) => (
            <option key={d.id} value={d.id}>{d.path}</option>
          ))}
        </select>
      </FormGroup>
    )
  }

  return (
    <div>
      <PageHeader
        title="Organizacion"
        subtitle="Estructura jerarquica del Poder Judicial"
        action={canWrite && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateForm(EMPTY_FORM)
              setCreateErrors({})
              setShowCreate(true)
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Nuevo nodo
          </button>
        )}
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={8} /></div>
        ) : tree.length === 0 ? (
          <EmptyState title="Sin datos" text="No se encontro estructura organizacional." />
        ) : (
          <div className="space-y-0.5">
            {tree.map((node, i) => (
              <OrgNode
                key={node.id || i}
                node={node}
                level={0}
                canWrite={canWrite}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo nodo organizacional"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Crear nodo'}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Tipo" required>
            <select
              className="form-control"
              value={createForm.tipo}
              onChange={(e) => setCreateForm((p) => ({ ...p, tipo: e.target.value, parentId: '' }))}
            >
              <option value="circunscripcion">Circunscripcion</option>
              <option value="distrito">Distrito</option>
              <option value="juzgado">Juzgado</option>
            </select>
          </FormGroup>

          <FormGroup label="Nombre" required error={createErrors.nombre}>
            <input
              className={`form-control ${createErrors.nombre ? 'error' : ''}`}
              value={createForm.nombre}
              onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.target.value }))}
            />
          </FormGroup>

          {renderParentField(createForm, setCreateForm, createErrors)}

          <FormGroup label="Ciudad">
            <input
              className="form-control"
              value={createForm.ciudad}
              onChange={(e) => setCreateForm((p) => ({ ...p, ciudad: e.target.value }))}
              placeholder="Opcional"
            />
          </FormGroup>
        </div>
      </Modal>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title={`Editar ${editForm.tipo || 'nodo'}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Guardar cambios'}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Tipo">
            <input className="form-control bg-gray-50" value={editForm.tipo} readOnly />
          </FormGroup>

          <FormGroup label="Nombre" required error={editErrors.nombre}>
            <input
              className={`form-control ${editErrors.nombre ? 'error' : ''}`}
              value={editForm.nombre}
              onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
            />
          </FormGroup>

          {renderParentField(editForm, setEditForm, editErrors)}

          <FormGroup label="Ciudad">
            <input
              className="form-control"
              value={editForm.ciudad}
              onChange={(e) => setEditForm((p) => ({ ...p, ciudad: e.target.value }))}
              placeholder="Opcional"
            />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
