import { useEffect, useMemo, useState } from 'react'
import { hardwareService, organizacionService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast, confirmDialog } from '../components'

const ESTADOS = ['', 'operativo', 'en_reparacion', 'en_deposito', 'baja']
const HARDWARE_TYPES = [
  { id: 1, nombre: 'PC' },
  { id: 2, nombre: 'Notebook' },
  { id: 3, nombre: 'Monitor' },
  { id: 4, nombre: 'Impresora' },
  { id: 5, nombre: 'Router / Switch' },
  { id: 6, nombre: 'UPS' },
  { id: 7, nombre: 'Servidor' },
  { id: 8, nombre: 'Otro' },
]
const formatEnum = (value) => (value || '').toLowerCase().replace('_', ' ')
const normalizeHardwareValue = (value) => (value || '').toLowerCase()
const getApiError = (err, fallback) => err.response?.data?.error?.message || err.response?.data?.message || fallback
const getValidationDetail = (err) => err.response?.data?.error?.details?.[0]?.message

const normalize = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const HARDWARE_TYPE_BY_ID = Object.fromEntries(HARDWARE_TYPES.map((t) => [String(t.id), t.nombre]))
const HARDWARE_TYPE_ID_BY_NAME = Object.fromEntries(HARDWARE_TYPES.map((t) => [normalize(t.nombre), t.id]))

function toBackendEstado(value) {
  const normalized = normalizeHardwareValue(value)
  if (normalized === 'deposito') return 'en_deposito'
  if (normalized === 'de_baja') return 'baja'
  return normalized
}

function getHardwareTypeId(item) {
  const directId = item?.tipoId ?? item?.tipo?.id ?? item?.hardwareTipoId
  if (directId) return Number(directId)

  const nombre = item?.tipo?.nombre || item?.tipoNombre || item?.tipoHardware || item?.tipo
  if (!nombre) return null
  return HARDWARE_TYPE_ID_BY_NAME[normalize(nombre)] || null
}

function getHardwareTypeLabel(item) {
  const typeId = getHardwareTypeId(item)
  if (typeId && HARDWARE_TYPE_BY_ID[String(typeId)]) return HARDWARE_TYPE_BY_ID[String(typeId)]
  return item?.tipo?.nombre || item?.tipoNombre || '-'
}

function validateCreate(form) {
  const e = {}
  if (!form.marca.trim()) e.marca = 'La marca es obligatoria.'
  if (!form.modelo.trim()) e.modelo = 'El modelo es obligatorio.'
  if (!form.numeroSerie.trim()) e.numeroSerie = 'El numero de serie es obligatorio.'
  if (!form.tipoId || Number(form.tipoId) <= 0) e.tipoId = 'El tipo es obligatorio.'
  return e
}

export default function Hardware() {
  const { isAdmin, isOperador } = useAuth()
  const canWrite = isAdmin || isOperador
  const { run, loading: saving } = useAsync()

  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fEstado,  setFEstado]  = useState('')
  const [fTipoId, setFTipoId] = useState('')
  const [fJuzgadoId, setFJuzgadoId] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [juzgados,   setJuzgados]   = useState([])
  const [errors, setErrors] = useState({})

  const juzgadoNameById = useMemo(
    () => Object.fromEntries(juzgados.map((j) => [String(j.id), j.nombre])),
    [juzgados]
  )

  const [form, setForm] = useState({
    marca: '', modelo: '', numeroSerie: '', tipoId: 1,
    juzgadoId: '', estado: 'operativo', observaciones: ''
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  async function load() {
    setLoading(true)
    try {
      const params = { page: 0, size: 50 }
      if (ESTADOS.includes(fEstado) && fEstado) params.estado = fEstado
      if (fTipoId) params.tipoId = Number(fTipoId)
      if (debouncedSearch) params.search = debouncedSearch
      if (fJuzgadoId) params.juzgadoId = Number(fJuzgadoId)

      const res = await hardwareService.listar(params)

      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (err) {
      showToast(getApiError(err, 'Error al cargar hardware'), 'error')
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [fEstado, fTipoId, debouncedSearch, fJuzgadoId])

  useEffect(() => {
    organizacionService.listarJuzgados().then(r => setJuzgados(r.data?.data ?? []))
  }, [])

  function openEdit(item) {
    setSelected(item)
    setForm({
      marca: item.marca || '', modelo: item.modelo || '',
      numeroSerie: item.numeroSerie || '', tipoId: getHardwareTypeId(item) || 1,
      juzgadoId: item.juzgado?.id || item.juzgadoId || '',
      estado: toBackendEstado(item.estado || 'operativo'), observaciones: item.observaciones || ''
    })
    setShowEdit(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validateCreate(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})

    try {
      const basePayload = {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        numeroSerie: form.numeroSerie.trim(),
        tipoId: Number(form.tipoId),
        juzgadoId: Number(form.juzgadoId) || undefined,
        observaciones: form.observaciones?.trim() || undefined,
      }

      await run(hardwareService.crear({
        ...basePayload,
        estado: toBackendEstado(form.estado),
      }))

      showToast('Equipo registrado', 'success')
      setShowCreate(false)
      setForm({ marca: '', modelo: '', numeroSerie: '', tipoId: 1, juzgadoId: '', estado: 'operativo', observaciones: '' })
      load()
    } catch (err) {
      showToast(getValidationDetail(err) || getApiError(err, 'Error al crear'), 'error')
    }
  }

  async function handleEdit(e) {
    e.preventDefault()

    const confirmed = await confirmDialog({
      title: 'Confirmar cambios',
      text: 'Se actualizara la informacion del equipo.',
      confirmText: 'Si, guardar',
      cancelText: 'Cancelar',
      icon: 'warning',
    })
    if (!confirmed) return

    try {
      const basePayload = {
        observaciones: form.observaciones?.trim() || undefined,
        juzgadoId: Number(form.juzgadoId) || undefined,
      }

      await run(hardwareService.actualizar(selected.id, {
        ...basePayload,
        estado: toBackendEstado(form.estado),
      }))

      showToast('Equipo actualizado', 'success')
      setShowEdit(false)
      load()
    } catch (err) {
      showToast(getValidationDetail(err) || getApiError(err, 'Error al actualizar'), 'error')
    }
  }

  const visibleItems = useMemo(() => {
    const searchTerm = debouncedSearch.toLowerCase()

    return items.filter((item) => {
      const estadoItem = toBackendEstado(item.estado)
      const juzgadoIdItem = String(item.juzgado?.id || item.juzgadoId || '')
      const tipoIdItem = getHardwareTypeId(item)
      const tipoLabel = getHardwareTypeLabel(item)

      const matchEstado = !fEstado || estadoItem === fEstado
      const matchTipo = !fTipoId || String(tipoIdItem || '') === String(fTipoId)
      const selectedJuzgadoName = juzgadoNameById[String(fJuzgadoId)] || ''
      const itemJuzgadoName = item.juzgado?.nombre || item.juzgadoNombre || ''
      const matchJuzgado = !fJuzgadoId
        || juzgadoIdItem === String(fJuzgadoId)
        || (selectedJuzgadoName && itemJuzgadoName && itemJuzgadoName === selectedJuzgadoName)
      const searchable = `${item.marca || ''} ${item.modelo || ''} ${item.numeroSerie || ''} ${item.numeroInventario || ''} ${item.juzgadoNombre || ''} ${juzgadoNameById[String(item.juzgadoId)] || ''} ${tipoLabel}`.toLowerCase()
      const matchSearch = !searchTerm || searchable.includes(searchTerm)

      return matchEstado && matchTipo && matchJuzgado && matchSearch
    })
  }, [items, fEstado, fTipoId, fJuzgadoId, debouncedSearch, juzgadoNameById])

  const columnCount = canWrite ? 8 : 7

  return (
    <div>
      <PageHeader
        title="Hardware"
        subtitle="Inventario de equipos registrados"
        action={canWrite && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Registrar equipo
          </button>
        )}
      />

      <div className="flex gap-2.5 mb-3.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por marca, serie..." />
        <select className="filter-select" value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
        </select>
        <select className="filter-select" value={fTipoId} onChange={e => setFTipoId(e.target.value)}>
          <option value="">Todos los tipos</option>
          {HARDWARE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select className="filter-select" value={fJuzgadoId} onChange={e => setFJuzgadoId(e.target.value)}>
          <option value="">Todos los juzgados</option>
          {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">ID</th>
                <th className="th">Marca / Modelo</th>
                <th className="th">N. de Serie</th>
                <th className="th">Tipo</th>
                <th className="th">Estado</th>
                <th className="th">Juzgado</th>
                <th className="th">Observaciones</th>
                {canWrite && <th className="th">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columnCount} className="td text-center py-12"><Spinner /></td></tr>
              ) : visibleItems.length === 0 ? (
                <tr><td colSpan={columnCount}><EmptyState title="Sin equipos" text="No se encontraron equipos." /></td></tr>
              ) : visibleItems.map(item => (
                <tr key={item.id} className="tr-body">
                  <td className="td font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="td">
                    <div className="font-medium text-gray-800">{item.marca} {item.modelo}</div>
                  </td>
                  <td className="td font-mono text-xs text-gray-500">{item.numeroSerie}</td>
                  <td className="td text-sm text-gray-600">{getHardwareTypeLabel(item)}</td>
                  <td className="td"><Badge value={item.estado} /></td>
                  <td className="td text-sm text-gray-500">{item.juzgado?.nombre || item.juzgadoNombre || juzgadoNameById[String(item.juzgadoId)] || '-'}</td>
                  <td className="td text-xs text-gray-400 max-w-[180px] truncate">{item.observaciones || '-'}</td>
                  {canWrite && (
                    <td className="td">
                      <button className="btn btn-edit btn-sm" onClick={() => openEdit(item)}>Editar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Registrar Equipo"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? <Spinner size={4}/> : 'Registrar'}</button>
        </>}>
        <form onSubmit={handleCreate}>
          <div className="grid grid-cols-2 gap-3.5">
            <FormGroup label="Marca" required>
              <input className={`form-control ${errors.marca ? 'error' : ''}`} value={form.marca} onChange={e => setForm(p => ({...p, marca: e.target.value}))} />
              {errors.marca && <p className="text-xs text-danger mt-1">{errors.marca}</p>}
            </FormGroup>
            <FormGroup label="Modelo" required>
              <input className={`form-control ${errors.modelo ? 'error' : ''}`} value={form.modelo} onChange={e => setForm(p => ({...p, modelo: e.target.value}))} />
              {errors.modelo && <p className="text-xs text-danger mt-1">{errors.modelo}</p>}
            </FormGroup>
            <FormGroup label="N. de Serie" required>
              <input className={`form-control ${errors.numeroSerie ? 'error' : ''}`} value={form.numeroSerie} onChange={e => setForm(p => ({...p, numeroSerie: e.target.value}))} />
              {errors.numeroSerie && <p className="text-xs text-danger mt-1">{errors.numeroSerie}</p>}
            </FormGroup>
            <FormGroup label="Tipo de hardware" required>
              <select className={`form-control ${errors.tipoId ? 'error' : ''}`} value={form.tipoId} onChange={e => setForm(p => ({...p, tipoId: e.target.value}))}>
                <option value="">Seleccionar tipo...</option>
                {HARDWARE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {errors.tipoId && <p className="text-xs text-danger mt-1">{errors.tipoId}</p>}
            </FormGroup>
            <FormGroup label="Juzgado">
              <select className="form-control" value={form.juzgadoId} onChange={e => setForm(p => ({...p, juzgadoId: e.target.value}))}>
                <option value="">Seleccionar juzgado...</option>
                {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Estado">
              <select className="form-control" value={form.estado} onChange={e => setForm(p => ({...p, estado: e.target.value}))}>
                {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
              </select>
            </FormGroup>
          </div>
          <FormGroup label="Observaciones">
            <textarea className="form-control h-auto py-2" rows={2} value={form.observaciones}
              onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} />
          </FormGroup>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Editar Equipo #${selected?.id}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? <Spinner size={4}/> : 'Guardar'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Estado">
            <select className="form-control" value={form.estado} onChange={e => setForm(p => ({...p, estado: e.target.value}))}>
              {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Juzgado">
            <select className="form-control" value={form.juzgadoId} onChange={e => setForm(p => ({...p, juzgadoId: e.target.value}))}>
              <option value="">Seleccionar juzgado...</option>
              {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </FormGroup>
        </div>
        <FormGroup label="Observaciones">
          <textarea className="form-control h-auto py-2" rows={3} value={form.observaciones}
            onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} />
        </FormGroup>
      </Modal>
    </div>
  )
}
