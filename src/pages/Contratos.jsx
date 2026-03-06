import { useEffect, useState } from 'react'
import { contratosService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const EMPTY_FORM = { proveedor: '', cobertura: '', fechaInicio: '', fechaVencimiento: '', responsableId: '' }

function validate(form) {
  const e = {}
  if (!form.proveedor.trim())     e.proveedor        = 'El proveedor es obligatorio.'
  if (!form.fechaVencimiento)     e.fechaVencimiento = 'La fecha de vencimiento es obligatoria.'
  return e
}

export default function Contratos() {
  const { isAdmin } = useAuth()
  const { run, loading: saving } = useAsync()

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})

  async function load() {
    setLoading(true)
    try {
      const res = await contratosService.listar({ search, page: 0, size: 50 })
      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    try {
      await run(contratosService.crear({
        proveedor:        form.proveedor,
        cobertura:        form.cobertura || undefined,
        fechaInicio:      form.fechaInicio || undefined,
        fechaVencimiento: form.fechaVencimiento,
        responsableId:    Number(form.responsableId) || undefined,
      }))
      showToast('Contrato creado correctamente', 'success')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al crear contrato', 'error')
    }
  }

  async function openDetail(c) {
    setSelected(c)
    setShowDetail(true)
  }

  const daysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Gestion de contratos con proveedores"
        action={isAdmin && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowCreate(true) }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Nuevo contrato
          </button>
        )}
      />

      <div className="flex gap-2.5 mb-3.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar proveedor, cobertura..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={8} /></div>
      ) : items.length === 0 ? (
        <EmptyState title="Sin contratos" text="No se encontraron contratos registrados." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map(c => {
            const days = daysUntil(c.fechaVencimiento)
            const warn = days !== null && days <= 90 && days >= 0
            return (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer
                  hover:border-pj-accent hover:shadow-md transition-all duration-150
                  ${warn ? 'border-l-[3px] border-l-warning' : ''}`}
              >
                <div className="text-base font-semibold text-gray-900 mb-0.5">{c.proveedor}</div>
                <div className="text-xs text-gray-500 mb-3">{c.cobertura || 'Sin descripcion de cobertura'}</div>
                <div className="flex items-end justify-between">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Vencimiento</div>
                      <div className={`text-sm mt-0.5 font-mono ${warn ? 'text-warning font-semibold' : 'text-gray-700'}`}>
                        {c.fechaVencimiento || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Estado</div>
                      <div className="mt-0.5"><Badge value={c.estadoContrato} /></div>
                    </div>
                  </div>
                  {warn && days !== null && (
                    <div className="text-xs font-semibold text-warning bg-warning-light px-2 py-0.5 rounded-full">
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Contrato"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Crear contrato'}
          </button>
        </>}
      >
        <FormGroup label="Proveedor" required error={errors.proveedor}>
          <input className={`form-control ${errors.proveedor ? 'error' : ''}`} value={form.proveedor}
            onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))}
            placeholder="Nombre del proveedor" />
        </FormGroup>
        <FormGroup label="Descripcion de cobertura">
          <input className="form-control" value={form.cobertura}
            onChange={e => setForm(p => ({ ...p, cobertura: e.target.value }))}
            placeholder="Ej: Soporte tecnico nivel 2, hardware" />
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
      </Modal>

      {/* DETAIL */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Contrato #${selected?.id}`}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['Proveedor',   selected.proveedor],
                ['Estado',      <Badge value={selected.estadoContrato} />],
                ['Cobertura',   selected.cobertura || '-'],
                ['Responsable', selected.responsable?.nombre || '-'],
                ['Inicio',      selected.fechaInicio || '-'],
                ['Vencimiento', selected.fechaVencimiento || '-'],
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
