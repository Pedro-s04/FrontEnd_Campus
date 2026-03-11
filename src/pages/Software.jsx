import { useEffect, useState } from 'react'
import { softwareService, contratosService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const TIPOS_LICENCIA = ['suscripcion_anual', 'perpetua', 'por_puesto']
const ESTADOS_LICENCIA = ['vigente', 'por_vencer', 'vencida']
const EMPTY_FORM = { nombre: '', version: '', fabricante: '', tipoLicencia: 'suscripcion_anual', puestos: '', fechaInicio: '', fechaVencimiento: '', contratoId: '' }

const formatEnum = (value) => (value || '').toLowerCase().replace(/_/g, ' ')
const normalize = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
const getApiError = (err, fallback) => err.response?.data?.error?.message || err.response?.data?.message || fallback
const toDateInput = (value) => (value ? String(value).slice(0, 10) : '')

function daysUntil(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}

function getDisplayEstado(item) {
  const days = daysUntil(item.fechaVencimiento)
  if (days !== null && days < 0) return 'vencida'
  if (days !== null && days <= 30) return 'por_vencer'
  return item.estadoLicencia || 'vigente'
}

function validate(form) {
  const e = {}
  if (!form.nombre.trim())      e.nombre     = 'El nombre es obligatorio.'
  if (!form.fabricante.trim())  e.fabricante = 'El fabricante es obligatorio.'
  return e
}

export default function Software() {
  const { isAdmin, isOperador } = useAuth()
  const canWrite = isAdmin || isOperador
  const { run, loading: saving } = useAsync()

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fEstado,    setFEstado]    = useState('')
  const [fTipoLicencia, setFTipoLicencia] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setEditForm]   = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [contratos,  setContratos]  = useState([])

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  async function load() {
    setLoading(true)
    try {
      const params = { page: 0, size: 50 }
      if (debouncedSearch) params.search = debouncedSearch
      if (ESTADOS_LICENCIA.includes(fEstado)) params.estadoLicencia = fEstado
      if (TIPOS_LICENCIA.includes(fTipoLicencia)) params.tipoLicencia = fTipoLicencia

      const res = await softwareService.listar(params)
      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (err) {
      showToast(getApiError(err, 'Error al cargar software'), 'error')
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [debouncedSearch, fEstado, fTipoLicencia])

  useEffect(() => {
    contratosService.listar({ page: 0, size: 100 }).then(r => {
      const d = r.data?.data
      setContratos(Array.isArray(d) ? d : d?.content ?? [])
    }).catch(err => {
      showToast(getApiError(err, 'No se pudieron cargar contratos'), 'error')
      setContratos([])
    })
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    try {
      await run(softwareService.crear({
        nombre:           form.nombre,
        version:          form.version || undefined,
        fabricante:       form.fabricante,
        tipoLicencia:     form.tipoLicencia,
        puestos:          Number(form.puestos) || undefined,
        fechaInicio:      form.fechaInicio || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
        contratoId:       Number(form.contratoId) || undefined,
      }))
      showToast('Licencia registrada correctamente', 'success')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      showToast(getApiError(err, 'Error al registrar'), 'error')
    }
  }

  function openEdit(item) {
    setEditId(item.id)
    setEditForm({
      nombre: item.nombre || '',
      version: item.version || '',
      fabricante: item.fabricante || '',
      tipoLicencia: TIPOS_LICENCIA.includes(item.tipoLicencia) ? item.tipoLicencia : 'suscripcion_anual',
      puestos: item.puestos ?? '',
      fechaInicio: toDateInput(item.fechaInicio),
      fechaVencimiento: toDateInput(item.fechaVencimiento),
      estadoLicencia: ESTADOS_LICENCIA.includes(item.estadoLicencia) ? item.estadoLicencia : 'vigente',
      contratoId: item.contrato?.id || item.contratoId || '',
    })
    setEditErrors({})
    setShowEdit(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    const errs = validate(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditErrors({})
    try {
      await run(softwareService.actualizar(editId, {
        nombre: editForm.nombre,
        version: editForm.version || undefined,
        fabricante: editForm.fabricante,
        tipoLicencia: editForm.tipoLicencia || undefined,
        puestos: Number(editForm.puestos) || undefined,
        fechaInicio: editForm.fechaInicio || undefined,
        fechaVencimiento: editForm.fechaVencimiento || undefined,
        estadoLicencia: editForm.estadoLicencia || undefined,
        contratoId: Number(editForm.contratoId) || undefined,
      }))
      showToast('Licencia actualizada correctamente', 'success')
      setShowEdit(false)
      setEditId(null)
      load()
    } catch (err) {
      showToast(getApiError(err, 'Error al actualizar licencia'), 'error')
    }
  }

  const visibleItems = items.filter((item) => {
    const q = normalize(debouncedSearch)
    const text = [
      item.nombre,
      item.fabricante,
      item.version,
      item.tipoLicencia,
      item.estadoLicencia,
    ].map(normalize).join(' ')

    const matchesSearch = !q || text.includes(q)
    const matchesEstado = !fEstado || normalize(getDisplayEstado(item)) === normalize(fEstado)
    const matchesTipo = !fTipoLicencia || normalize(item.tipoLicencia) === normalize(fTipoLicencia)

    return matchesSearch && matchesEstado && matchesTipo
  })

  return (
    <div>
      <PageHeader
        title="Software y Licencias"
        subtitle="Registro y control de licencias de software"
        action={canWrite && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowCreate(true) }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Nueva licencia
          </button>
        )}
      />

      <div className="flex gap-2.5 mb-3.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar software, fabricante..." />
        <select className="filter-select" value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_LICENCIA.map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
        </select>
        <select className="filter-select" value={fTipoLicencia} onChange={e => setFTipoLicencia(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS_LICENCIA.map(t => <option key={t} value={t}>{formatEnum(t)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">ID</th>
                <th className="th">Nombre</th>
                <th className="th">Fabricante</th>
                <th className="th">Tipo</th>
                <th className="th">Estado</th>
                <th className="th">Vencimiento</th>
                <th className="th text-center">Puestos</th>
                {canWrite && <th className="th text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canWrite ? 8 : 7} className="td text-center py-12"><Spinner /></td></tr>
              ) : visibleItems.length === 0 ? (
                <tr><td colSpan={canWrite ? 8 : 7}><EmptyState title="Sin licencias" text="No se encontraron registros de software." /></td></tr>
              ) : visibleItems.map(item => (
                <tr key={item.id} className="tr-body">
                  <td className="td font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="td font-medium text-gray-800">{item.nombre}</td>
                  <td className="td text-sm text-gray-500">{item.fabricante}</td>
                  <td className="td text-xs text-gray-500">{formatEnum(item.tipoLicencia)}</td>
                  <td className="td"><Badge value={getDisplayEstado(item)} /></td>
                  <td className="td font-mono text-xs text-gray-400">{item.fechaVencimiento || '-'}</td>
                  <td className="td text-center text-sm text-gray-600">{item.puestos ?? '-'}</td>
                  {canWrite && (
                    <td className="td text-center">
                      <button className="btn btn-secondary" onClick={() => openEdit(item)}>
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Registrar Nueva Licencia" wide
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Registrar'}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Nombre del software" required error={errors.nombre}>
            <input className={`form-control ${errors.nombre ? 'error' : ''}`} value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Microsoft Office" />
          </FormGroup>
          <FormGroup label="Fabricante" required error={errors.fabricante}>
            <input className={`form-control ${errors.fabricante ? 'error' : ''}`} value={form.fabricante}
              onChange={e => setForm(p => ({ ...p, fabricante: e.target.value }))} placeholder="Ej: Microsoft" />
          </FormGroup>
          <FormGroup label="Version">
            <input className="form-control" value={form.version}
              onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="Ej: 2021" />
          </FormGroup>
          <FormGroup label="Tipo de licencia">
            <select className="form-control" value={form.tipoLicencia}
              onChange={e => setForm(p => ({ ...p, tipoLicencia: e.target.value }))}>
              {TIPOS_LICENCIA.map(t => <option key={t} value={t}>{formatEnum(t)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Cantidad de puestos">
            <input type="number" min="1" className="form-control" value={form.puestos}
              onChange={e => setForm(p => ({ ...p, puestos: e.target.value }))} placeholder="Ej: 50" />
          </FormGroup>
          <FormGroup label="Fecha de inicio">
            <input type="date" className="form-control" value={form.fechaInicio}
              onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Fecha de vencimiento" error={errors.fechaVencimiento}>
            <input type="date" className={`form-control ${errors.fechaVencimiento ? 'error' : ''}`} value={form.fechaVencimiento}
              onChange={e => setForm(p => ({ ...p, fechaVencimiento: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Contrato vinculado" className="col-span-2">
            <select className="form-control" value={form.contratoId}
              onChange={e => setForm(p => ({ ...p, contratoId: e.target.value }))}>
              <option value="">Sin contrato</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.proveedor} — {c.cobertura}</option>)}
            </select>
          </FormGroup>
        </div>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Editar Licencia #${editId || ''}`} wide
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Guardar cambios'}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Nombre del software" required error={editErrors.nombre}>
            <input className={`form-control ${editErrors.nombre ? 'error' : ''}`} value={editForm.nombre}
              onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Microsoft Office" />
          </FormGroup>
          <FormGroup label="Fabricante" required error={editErrors.fabricante}>
            <input className={`form-control ${editErrors.fabricante ? 'error' : ''}`} value={editForm.fabricante}
              onChange={e => setEditForm(p => ({ ...p, fabricante: e.target.value }))} placeholder="Ej: Microsoft" />
          </FormGroup>
          <FormGroup label="Version">
            <input className="form-control" value={editForm.version}
              onChange={e => setEditForm(p => ({ ...p, version: e.target.value }))} placeholder="Ej: 2021" />
          </FormGroup>
          <FormGroup label="Tipo de licencia">
            <select className="form-control" value={editForm.tipoLicencia}
              onChange={e => setEditForm(p => ({ ...p, tipoLicencia: e.target.value }))}>
              {TIPOS_LICENCIA.map(t => <option key={t} value={t}>{formatEnum(t)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Estado de licencia">
            <select className="form-control" value={editForm.estadoLicencia || 'vigente'}
              onChange={e => setEditForm(p => ({ ...p, estadoLicencia: e.target.value }))}>
              {ESTADOS_LICENCIA.map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Cantidad de puestos">
            <input type="number" min="1" className="form-control" value={editForm.puestos}
              onChange={e => setEditForm(p => ({ ...p, puestos: e.target.value }))} placeholder="Ej: 50" />
          </FormGroup>
          <FormGroup label="Fecha de inicio">
            <input type="date" className="form-control" value={editForm.fechaInicio}
              onChange={e => setEditForm(p => ({ ...p, fechaInicio: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Fecha de vencimiento">
            <input type="date" className="form-control" value={editForm.fechaVencimiento}
              onChange={e => setEditForm(p => ({ ...p, fechaVencimiento: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Contrato vinculado" className="col-span-2">
            <select className="form-control" value={editForm.contratoId}
              onChange={e => setEditForm(p => ({ ...p, contratoId: e.target.value }))}>
              <option value="">Sin contrato</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.proveedor} — {c.cobertura}</option>)}
            </select>
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
