import { useEffect, useState } from 'react'
import { hardwareService, organizacionService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const ESTADOS = ['', 'operativo', 'en_reparacion', 'deposito', 'de_baja']

export default function Hardware() {
  const { isAdmin, isOperador } = useAuth()
  const canWrite = isAdmin || isOperador
  const { run, loading: saving } = useAsync()

  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [fEstado,  setFEstado]  = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [juzgados,   setJuzgados]   = useState([])

  const [form, setForm] = useState({
    marca: '', modelo: '', numeroSerie: '', tipoId: 1,
    juzgadoId: '', estado: 'operativo', observaciones: ''
  })

  async function load() {
    setLoading(true)
    try {
      const res = await hardwareService.listar({ estado: fEstado, search, page: 0, size: 50 })
      const d = res.data?.data
      setItems(Array.isArray(d) ? d : d?.content ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [fEstado, search])

  useEffect(() => {
    organizacionService.listarJuzgados().then(r => setJuzgados(r.data?.data ?? []))
  }, [])

  function openEdit(item) {
    setSelected(item)
    setForm({
      marca: item.marca || '', modelo: item.modelo || '',
      numeroSerie: item.numeroSerie || '', tipoId: item.tipoId || 1,
      juzgadoId: item.juzgado?.id || item.juzgadoId || '',
      estado: item.estado || 'operativo', observaciones: item.observaciones || ''
    })
    setShowEdit(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await run(hardwareService.crear({
        ...form,
        tipoId: Number(form.tipoId),
        juzgadoId: Number(form.juzgadoId) || undefined,
      }))
      showToast('Equipo registrado', 'success')
      setShowCreate(false)
      setForm({ marca: '', modelo: '', numeroSerie: '', tipoId: 1, juzgadoId: '', estado: 'operativo', observaciones: '' })
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al crear', 'error')
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    try {
      await run(hardwareService.actualizar(selected.id, {
        estado: form.estado,
        observaciones: form.observaciones,
        juzgadoId: Number(form.juzgadoId) || undefined,
      }))
      showToast('Equipo actualizado', 'success')
      setShowEdit(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar', 'error')
    }
  }

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
          {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
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
                <th className="th">Estado</th>
                <th className="th">Juzgado</th>
                <th className="th">Observaciones</th>
                {canWrite && <th className="th">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="td text-center py-12"><Spinner /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="Sin equipos" text="No se encontraron equipos." /></td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="tr-body">
                  <td className="td font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="td">
                    <div className="font-medium text-gray-800">{item.marca} {item.modelo}</div>
                  </td>
                  <td className="td font-mono text-xs text-gray-500">{item.numeroSerie}</td>
                  <td className="td"><Badge value={item.estado} /></td>
                  <td className="td text-sm text-gray-500">{item.juzgado?.nombre || '-'}</td>
                  <td className="td text-xs text-gray-400 max-w-[180px] truncate">{item.observaciones || '-'}</td>
                  {canWrite && (
                    <td className="td">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Editar</button>
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
              <input className="form-control" value={form.marca} onChange={e => setForm(p => ({...p, marca: e.target.value}))} />
            </FormGroup>
            <FormGroup label="Modelo" required>
              <input className="form-control" value={form.modelo} onChange={e => setForm(p => ({...p, modelo: e.target.value}))} />
            </FormGroup>
            <FormGroup label="N. de Serie" required>
              <input className="form-control" value={form.numeroSerie} onChange={e => setForm(p => ({...p, numeroSerie: e.target.value}))} />
            </FormGroup>
            <FormGroup label="Tipo ID">
              <input type="number" className="form-control" value={form.tipoId} onChange={e => setForm(p => ({...p, tipoId: e.target.value}))} />
            </FormGroup>
            <FormGroup label="Juzgado">
              <select className="form-control" value={form.juzgadoId} onChange={e => setForm(p => ({...p, juzgadoId: e.target.value}))}>
                <option value="">Deposito (sin juzgado)</option>
                {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Estado">
              <select className="form-control" value={form.estado} onChange={e => setForm(p => ({...p, estado: e.target.value}))}>
                {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
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
              {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Juzgado">
            <select className="form-control" value={form.juzgadoId} onChange={e => setForm(p => ({...p, juzgadoId: e.target.value}))}>
              <option value="">Deposito</option>
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
