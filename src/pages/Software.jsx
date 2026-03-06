import { useEffect, useState } from 'react'
import { softwareService, contratosService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const TIPOS_LICENCIA = ['suscripcion_anual', 'perpetua', 'por_puesto']
const EMPTY_FORM = { nombre: '', fabricante: '', tipoLicencia: 'suscripcion_anual', puestos: '', fechaInicio: '', fechaVencimiento: '', contratoId: '' }

function validate(form) {
  const e = {}
  if (!form.nombre.trim())      e.nombre     = 'El nombre es obligatorio.'
  if (!form.fabricante.trim())  e.fabricante = 'El fabricante es obligatorio.'
  if (!form.fechaVencimiento)   e.fechaVencimiento = 'La fecha de vencimiento es obligatoria.'
  return e
}

export default function Software() {
  const { isAdmin, isOperador } = useAuth()
  const canWrite = isAdmin || isOperador
  const { run, loading: saving } = useAsync()

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [fEstado,    setFEstado]    = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})
  const [contratos,  setContratos]  = useState([])

  async function load() {
    setLoading(true)
    try {
      const res = await softwareService.listar({ search, estadoLicencia: fEstado, page: 0, size: 50 })
      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [search, fEstado])

  useEffect(() => {
    contratosService.listar({ page: 0, size: 100 }).then(r => {
      const d = r.data?.data
      setContratos(Array.isArray(d) ? d : d?.content ?? [])
    }).catch(() => {})
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    try {
      await run(softwareService.crear({
        nombre:           form.nombre,
        fabricante:       form.fabricante,
        tipoLicencia:     form.tipoLicencia,
        puestos:          Number(form.puestos) || undefined,
        fechaInicio:      form.fechaInicio || undefined,
        fechaVencimiento: form.fechaVencimiento,
        contratoId:       Number(form.contratoId) || undefined,
      }))
      showToast('Licencia registrada correctamente', 'success')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al registrar', 'error')
    }
  }

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
          <option value="vigente">Vigente</option>
          <option value="por_vencer">Por vencer</option>
          <option value="vencida">Vencida</option>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="td text-center py-12"><Spinner /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="Sin licencias" text="No se encontraron registros de software." /></td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="tr-body">
                  <td className="td font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="td font-medium text-gray-800">{item.nombre}</td>
                  <td className="td text-sm text-gray-500">{item.fabricante}</td>
                  <td className="td text-xs text-gray-500">{item.tipoLicencia?.replace(/_/g, ' ')}</td>
                  <td className="td"><Badge value={item.estadoLicencia} /></td>
                  <td className="td font-mono text-xs text-gray-400">{item.fechaVencimiento || '-'}</td>
                  <td className="td text-center text-sm text-gray-600">{item.puestos ?? '-'}</td>
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
          <FormGroup label="Tipo de licencia">
            <select className="form-control" value={form.tipoLicencia}
              onChange={e => setForm(p => ({ ...p, tipoLicencia: e.target.value }))}>
              {TIPOS_LICENCIA.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
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
          <FormGroup label="Fecha de vencimiento" required error={errors.fechaVencimiento}>
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
    </div>
  )
}
