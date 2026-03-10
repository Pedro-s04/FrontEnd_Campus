import { useEffect, useState } from 'react'
import { usuariosService, organizacionService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const ROLES_MAP = { 1: 'ADMINISTRADOR', 2: 'OPERADOR', 3: 'TECNICO' }

const EMPTY_FORM = { legajo: '', username: '', nombre: '', email: '', password: '', rolId: '2', juzgadoId: '' }

function validateCreate(form) {
  const e = {}
  if (!form.legajo.trim())    e.legajo   = 'El legajo es obligatorio.'
  if (!form.username.trim())  e.username = 'El nombre de usuario es obligatorio.'
  if (!form.nombre.trim())    e.nombre   = 'El nombre completo es obligatorio.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalido.'
  if (!form.password)         e.password = 'La contrasena es obligatoria.'
  else if (form.password.length < 6) e.password = 'Minimo 6 caracteres.'
  return e
}

function validateEdit(form) {
  const e = {}
  if (!form.nombre.trim())   e.nombre = 'El nombre es obligatorio.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalido.'
  return e
}

function resolveRol(user) {
  const fromRolObject = typeof user?.rol === 'object'
    ? (user.rol?.nombre || user.rol?.codigo || user.rol?.rol)
    : null

  const fromRolString = typeof user?.rol === 'string' ? user.rol : null

  const roleId = user?.rolId ?? user?.idRol ?? user?.rol?.id ?? (typeof user?.rol === 'number' ? user.rol : null)
  const fromId = roleId != null ? ROLES_MAP[Number(roleId)] : null

  const normalized = (fromRolString || fromRolObject || user?.rolNombre || user?.role || fromId || '').toString().trim().toUpperCase()
  return normalized
}

export default function Usuarios() {
  const { run, loading: saving } = useAsync()

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [fRol,       setFRol]       = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [editForm,   setEditForm]   = useState({ nombre: '', email: '', juzgadoId: '', activo: true })
  const [errors,     setErrors]     = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [juzgados,   setJuzgados]   = useState([])

  async function load() {
    setLoading(true)
    try {
      const res = await usuariosService.listar({ rol: fRol, search, page: 0, size: 50 })
      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [fRol, search])

  useEffect(() => {
    organizacionService.listarJuzgados()
      .then(r => setJuzgados(r.data?.data ?? []))
      .catch(() => {})
  }, [])

  function openEdit(u) {
    setSelected(u)
    setEditForm({
      nombre:    u.nombre    || '',
      email:     u.email     || '',
      juzgadoId: u.juzgado?.id || u.juzgadoId || '',
      activo:    u.activo ?? true,
    })
    setEditErrors({})
    setShowEdit(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validateCreate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    try {
      await run(usuariosService.crear({
        legajo:    form.legajo,
        username:  form.username,
        nombre:    form.nombre,
        email:     form.email || undefined,
        password:  form.password,
        rolId:     Number(form.rolId),
        juzgadoId: Number(form.juzgadoId) || undefined,
      }))
      showToast('Usuario creado correctamente', 'success')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al crear usuario', 'error')
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const errs = validateEdit(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditErrors({})
    try {
      await run(usuariosService.editar(selected.id, {
        nombre:    editForm.nombre,
        email:     editForm.email || undefined,
        juzgadoId: Number(editForm.juzgadoId) || undefined,
        activo:    editForm.activo,
      }))
      showToast('Usuario actualizado', 'success')
      setShowEdit(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar', 'error')
    }
  }

  async function handleBaja(u) {
    if (!confirm(`Dar de baja a ${u.nombre}?`)) return
    try {
      await usuariosService.eliminar(u.id)
      showToast('Usuario dado de baja', 'success')
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Gestion de usuarios del sistema"
        action={
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowCreate(true) }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Nuevo usuario
          </button>
        }
      />

      <div className="flex gap-2.5 mb-3.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, usuario, legajo..." />
        <select className="filter-select" value={fRol} onChange={e => setFRol(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="OPERADOR">Operador</option>
          <option value="TECNICO">Tecnico</option>
        </select>
      </div>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Legajo</th>
                <th className="th">Nombre</th>
                <th className="th">Username</th>
                <th className="th">Email</th>
                <th className="th">Rol</th>
                <th className="th">Estado</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="td text-center py-12"><Spinner /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="Sin usuarios" text="No se encontraron usuarios." /></td></tr>
              ) : items.map(u => {
                const roleLabel = resolveRol(u)
                return (
                  <tr key={u.id} className="tr-body">
                    <td className="td font-mono text-xs text-gray-500">{u.legajo}</td>
                    <td className="td font-medium text-gray-800">{u.nombre}</td>
                    <td className="td text-sm text-gray-500">{u.username}</td>
                    <td className="td text-sm text-gray-400">{u.email || '-'}</td>
                    <td className="td">
                      {roleLabel ? <Badge value={roleLabel} /> : <span className="text-gray-400 text-sm">-</span>}
                    </td>
                    <td className="td">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.activo ? 'text-success' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-success' : 'bg-gray-300'}`} />
                        {u.activo ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex gap-1.5">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Editar</button>
                        {u.activo && (
                          <button className="btn btn-sm bg-transparent border-transparent text-danger hover:bg-danger-light" onClick={() => handleBaja(u)}>
                            Baja
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Usuario" wide
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Crear usuario'}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Legajo" required error={errors.legajo}>
            <input className={`form-control ${errors.legajo ? 'error' : ''}`} value={form.legajo}
              onChange={e => setForm(p => ({ ...p, legajo: e.target.value }))} placeholder="Ej: 12345" />
          </FormGroup>
          <FormGroup label="Username" required error={errors.username}>
            <input className={`form-control ${errors.username ? 'error' : ''}`} value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Ej: jperez" />
          </FormGroup>
          <FormGroup label="Nombre completo" required error={errors.nombre}>
            <input className={`form-control ${errors.nombre ? 'error' : ''}`} value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Juan Perez" />
          </FormGroup>
          <FormGroup label="Email" error={errors.email}>
            <input type="email" className={`form-control ${errors.email ? 'error' : ''}`} value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Ej: jperez@pj.gov.ar" />
          </FormGroup>
          <FormGroup label="Contrasena" required error={errors.password}>
            <input type="password" className={`form-control ${errors.password ? 'error' : ''}`} value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimo 6 caracteres" />
          </FormGroup>
          <FormGroup label="Rol">
            <select className="form-control" value={form.rolId}
              onChange={e => setForm(p => ({ ...p, rolId: e.target.value }))}>
              <option value="1">Administrador</option>
              <option value="2">Operador</option>
              <option value="3">Tecnico</option>
            </select>
          </FormGroup>
          <FormGroup label="Juzgado asignado">
            <select className="form-control" value={form.juzgadoId}
              onChange={e => setForm(p => ({ ...p, juzgadoId: e.target.value }))}>
              <option value="">Sin juzgado asignado</option>
              {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </FormGroup>
        </div>
      </Modal>

      {/* EDIT */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Editar Usuario — ${selected?.username}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Guardar cambios'}
          </button>
        </>}
      >
        <FormGroup label="Nombre completo" required error={editErrors.nombre}>
          <input className={`form-control ${editErrors.nombre ? 'error' : ''}`} value={editForm.nombre}
            onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} />
        </FormGroup>
        <FormGroup label="Email" error={editErrors.email}>
          <input type="email" className={`form-control ${editErrors.email ? 'error' : ''}`} value={editForm.email}
            onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
        </FormGroup>
        <FormGroup label="Juzgado asignado">
          <select className="form-control" value={editForm.juzgadoId}
            onChange={e => setEditForm(p => ({ ...p, juzgadoId: e.target.value }))}>
            <option value="">Sin juzgado asignado</option>
            {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Estado">
          <select className="form-control" value={String(editForm.activo)}
            onChange={e => setEditForm(p => ({ ...p, activo: e.target.value === 'true' }))}>
            <option value="true">Activo</option>
            <option value="false">Baja</option>
          </select>
        </FormGroup>
      </Modal>
    </div>
  )
}
