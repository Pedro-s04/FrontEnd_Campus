import { useEffect, useState } from 'react'
import { contratosService, usuariosService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast, confirmDialog } from '../components'

const ESTADOS_CONTRATO = ['vigente', 'por_vencer', 'vencido']
const EMPTY_FORM = { proveedor: '', cobertura: '', detalle: '', fechaInicio: '', fechaVencimiento: '', montoAnual: '', responsableId: '' }
const formatEnum = (value) => (value || '').toLowerCase().replace(/_/g, ' ')
const getApiError = (err, fallback) => err.response?.data?.error?.message || err.response?.data?.message || fallback
const normalize = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const normalizeEstado = (value) => normalize(value).replace(/\s+/g, '_')
const normalizeRole = (value) => normalize(value).replace(/^role_/, '').toUpperCase()

function validate(form) {
  const e = {}
  if (!form.proveedor.trim())     e.proveedor        = 'El proveedor es obligatorio.'
  if (!form.cobertura.trim())     e.cobertura        = 'La cobertura es obligatoria.'
  if (!form.fechaVencimiento)     e.fechaVencimiento = 'La fecha de vencimiento es obligatoria.'
  return e
}

function toFormValues(item) {
  if (!item) return EMPTY_FORM
  return {
    proveedor: item.proveedor || '',
    cobertura: item.cobertura || '',
    detalle: item.detalle || '',
    fechaInicio: item.fechaInicio || '',
    fechaVencimiento: item.fechaVencimiento || '',
    montoAnual: item.montoAnual ?? '',
    responsableId: item.responsable?.id || item.responsableId || '',
  }
}

function buildPayload(form) {
  return {
    proveedor: form.proveedor.trim(),
    cobertura: form.cobertura.trim(),
    detalle: form.detalle?.trim() || undefined,
    fechaInicio: form.fechaInicio || undefined,
    fechaVencimiento: form.fechaVencimiento || undefined,
    montoAnual: form.montoAnual ? Number(form.montoAnual) : undefined,
    responsableId: Number(form.responsableId) || undefined,
  }
}

function resolveResponsableNombre(item, responsables) {
  if (!item) return '-'
  if (item.responsable?.nombre) return item.responsable.nombre
  if (item.responsableNombre) return item.responsableNombre

  const rid = item.responsable?.id || item.responsableId
  if (!rid) return '-'

  const responsable = responsables.find((u) => String(u.id) === String(rid))
  return responsable?.nombre || `ID ${rid}`
}

function resolveEstadoContrato(item, daysUntilFn) {
  const estado = normalizeEstado(item?.estadoContrato)
  if (['vigente', 'por_vencer', 'vencido'].includes(estado)) return estado

  const days = daysUntilFn(item?.fechaVencimiento)
  if (days === null) return 'vigente'
  if (days < 0) return 'vencido'
  if (days <= 90) return 'por_vencer'
  return 'vigente'
}

function ContractStatusBadge({ estado }) {
  const palette = {
    vigente: {
      chip: 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 ring-1 ring-emerald-200 shadow-sm shadow-emerald-100',
      dot: 'bg-emerald-500',
      label: 'Vigente',
    },
    por_vencer: {
      chip: 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 ring-1 ring-amber-200 shadow-sm shadow-amber-100',
      dot: 'bg-amber-500',
      label: 'Por vencer',
    },
    vencido: {
      chip: 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 ring-1 ring-rose-200 shadow-sm shadow-rose-100',
      dot: 'bg-rose-600',
      label: 'Vencido',
    },
  }[estado] || {
    chip: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
    label: formatEnum(estado || '-'),
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${palette.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
      {palette.label}
    </span>
  )
}

export default function Contratos() {
  const { isAdmin } = useAuth()
  const { run, loading: saving } = useAsync()

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fEstado,    setFEstado]    = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [responsables, setResponsables] = useState([])
  const [selected,   setSelected]   = useState(null)
  const [detailLoad, setDetailLoad] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  async function load() {
    setLoading(true)
    try {
      const params = { page: 0, size: 50 }
      if (debouncedSearch) params.search = debouncedSearch

      const res = await contratosService.listar(params)
      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (err) {
      showToast(getApiError(err, 'Error al cargar contratos'), 'error')
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [debouncedSearch, fEstado])

  useEffect(() => {
    usuariosService
      .listar({ activo: true, page: 0, size: 200 })
      .then((res) => {
        const d = res.data?.data
        const list = Array.isArray(d) ? d : d?.content ?? []
        const operadores = list.filter((u) => {
          const rol = u?.rol?.nombre || u?.rol || u?.rolNombre || u?.role
          return normalizeRole(rol) === 'OPERADOR'
        })
        setResponsables(operadores)
      })
      .catch(() => {
        setResponsables([])
      })
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    if (editingId) {
      const confirmed = await confirmDialog({
        title: 'Confirmar cambios',
        text: 'Se actualizara la informacion del contrato.',
        confirmText: 'Si, guardar',
        cancelText: 'Cancelar',
        icon: 'warning',
      })
      if (!confirmed) return
    }

    try {
      const payload = buildPayload(form)
      if (editingId) {
        await run(contratosService.actualizar(editingId, payload))
        showToast('Contrato actualizado correctamente', 'success')
      } else {
        await run(contratosService.crear(payload))
        showToast('Contrato creado correctamente', 'success')
      }
      setShowCreate(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      showToast(getApiError(err, editingId ? 'Error al actualizar contrato' : 'Error al crear contrato'), 'error')
    }
  }

  function openCreateModal() {
    setErrors({})
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowCreate(true)
  }

  async function openEditModal(item) {
    setErrors({})
    setEditingId(item.id)
    setForm(toFormValues(item))
    setShowCreate(true)
  }

  async function openDetail(c) {
    setDetailLoad(true)
    setSelected(null)
    setShowDetail(true)
    try {
      const res = await contratosService.obtener(c.id)
      setSelected(res.data?.data ?? c)
    } catch (err) {
      showToast(getApiError(err, 'Error al cargar el detalle del contrato'), 'error')
      setSelected(c)
    } finally {
      setDetailLoad(false)
    }
  }

  const daysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const visibleItems = items.filter((item) => {
    const query = normalize(debouncedSearch)
    const text = [
      item.proveedor,
      item.cobertura,
      item.detalle,
      item.responsable?.nombre,
    ].map(normalize).join(' ')

    const estadoItem = resolveEstadoContrato(item, daysUntil)
    const matchesSearch = !query || text.includes(query)
    const matchesEstado = !fEstado || estadoItem === fEstado

    return matchesSearch && matchesEstado
  })

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Gestion de contratos con proveedores"
        action={isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Nuevo contrato
          </button>
        )}
      />

      <div className="flex gap-2.5 mb-3.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar proveedor, cobertura..." />
        <select className="filter-select" value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_CONTRATO.map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={8} /></div>
      ) : visibleItems.length === 0 ? (
        <EmptyState title="Sin contratos" text="No se encontraron contratos registrados." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleItems.map(c => {
            const days = daysUntil(c.fechaVencimiento)
            const status = resolveEstadoContrato(c, daysUntil)
            const isWarning = status === 'por_vencer'
            const isExpired = status === 'vencido'
            const isVigente = status === 'vigente'
            return (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer
                  hover:border-pj-accent hover:shadow-md transition-all duration-150
                  ${isVigente ? 'border-l-[3px] border-l-success' : ''}
                  ${isWarning ? 'border-l-[3px] border-l-warning' : ''}
                  ${isExpired ? 'border-l-[3px] border-l-danger' : ''}`}
              >
                <div className="text-base font-semibold text-gray-900 mb-0.5">{c.proveedor}</div>
                <div className="text-xs text-gray-500 mb-3">{c.cobertura || 'Sin descripcion de cobertura'}</div>
                <div className="flex items-end justify-between">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Vencimiento</div>
                      <div className={`text-sm mt-0.5 font-mono ${isWarning ? 'text-warning font-semibold' : isExpired ? 'text-danger font-semibold' : 'text-gray-700'}`}>
                        {c.fechaVencimiento || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Estado</div>
                      <div className="mt-0.5"><ContractStatusBadge estado={status} /></div>
                    </div>
                  </div>
                  {days !== null && (
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isVigente
                        ? 'text-success bg-success-light'
                        : isWarning
                          ? 'text-warning bg-warning-light'
                          : isExpired
                            ? 'text-danger bg-danger-light'
                            : 'text-gray-500 bg-gray-100'
                    }`}>
                      {days}d
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditingId(null) }} title={editingId ? `Editar Contrato #${editingId}` : 'Nuevo Contrato'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setEditingId(null) }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={4} /> : editingId ? 'Guardar cambios' : 'Crear contrato'}
          </button>
        </>}
      >
        <FormGroup label="Proveedor" required error={errors.proveedor}>
          <input className={`form-control ${errors.proveedor ? 'error' : ''}`} value={form.proveedor}
            onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))}
            placeholder="Nombre del proveedor" />
        </FormGroup>
        <FormGroup label="Descripcion de cobertura" required error={errors.cobertura}>
          <input className={`form-control ${errors.cobertura ? 'error' : ''}`} value={form.cobertura}
            onChange={e => setForm(p => ({ ...p, cobertura: e.target.value }))}
            placeholder="Ej: Soporte tecnico nivel 2, hardware" />
        </FormGroup>
        <FormGroup label="Detalle">
          <input className="form-control" value={form.detalle}
            onChange={e => setForm(p => ({ ...p, detalle: e.target.value }))}
            placeholder="Notas o alcance del contrato" />
        </FormGroup>
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Fecha de inicio">
            <input type="date" className="form-control" value={form.fechaInicio}
              onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Fecha de vencimiento" required error={errors.fechaVencimiento}>
            <input type="date" className={`form-control ${errors.fechaVencimiento ? 'error' : ''}`}
              value={form.fechaVencimiento}
              onChange={e => setForm(p => ({ ...p, fechaVencimiento: e.target.value }))} />
          </FormGroup>
        </div>
        <FormGroup label="Monto anual">
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            value={form.montoAnual}
            onChange={e => setForm(p => ({ ...p, montoAnual: e.target.value }))}
            placeholder="Ej: 1500000"
          />
        </FormGroup>
        <FormGroup label="Responsable">
          <select
            className="form-control"
            value={form.responsableId}
            onChange={e => setForm(p => ({ ...p, responsableId: e.target.value }))}
          >
            <option value="">Sin responsable</option>
            {responsables.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </FormGroup>
      </Modal>

      {/* DETAIL */}
      <Modal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={`Contrato #${selected?.id}`}
        footer={isAdmin && selected && !detailLoad ? (
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>Cerrar</button>
            <button
              className="btn btn-edit"
              onClick={async () => {
                setShowDetail(false)
                await openEditModal(selected)
              }}
            >
              Editar contrato
            </button>
          </>
        ) : null}
      >
        {detailLoad ? (
          <div className="flex justify-center py-10"><Spinner size={8} /></div>
        ) : selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['Proveedor',   selected.proveedor],
                ['Estado',      <ContractStatusBadge estado={resolveEstadoContrato(selected, daysUntil)} />],
                ['Cobertura',   selected.cobertura || '-'],
                ['Responsable', resolveResponsableNombre(selected, responsables)],
                ['Inicio',      selected.fechaInicio || '-'],
                ['Vencimiento', selected.fechaVencimiento || '-'],
                ['Monto anual', selected.montoAnual ?? '-'],
              ].map(([label, value], i) => (
                <div key={i}>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-sm text-gray-800">{value}</div>
                </div>
              ))}
            </div>
            {selected.software?.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Software vinculado</div>
                {selected.software.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                    <span className="text-gray-700">{s.nombre}</span>
                    <Badge value={s.estadoLicencia} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
