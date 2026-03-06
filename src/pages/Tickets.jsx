import { useEffect, useState } from 'react'
import { ticketsService, organizacionService, usuariosService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const ESTADOS     = ['solicitado', 'asignado', 'en_curso', 'cerrado']
const PRIORIDADES = ['alta', 'media', 'baja']
const EMPTY_FORM  = { descripcion: '', prioridad: 'media', juzgadoId: '', tecnicoId: '', hardwareId: '' }

function validate(form) {
  const e = {}
  if (!form.descripcion.trim())            e.descripcion = 'La descripcion es obligatoria.'
  else if (form.descripcion.trim().length < 10) e.descripcion = 'Minimo 10 caracteres.'
  if (!form.juzgadoId)                     e.juzgadoId   = 'Seleccione un juzgado.'
  return e
}

function BitacoraTimeline({ entries }) {
  if (!entries?.length) return <p className="text-sm text-gray-400 italic">Sin entradas en la bitacora.</p>
  return (
    <div className="relative pl-5">
      <div className="absolute left-2 top-1.5 bottom-1.5 w-0.5 bg-gray-200" />
      {entries.map((e, i) => (
        <div key={i} className="relative mb-4 last:mb-0">
          <div className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-pj-accent border-2 border-white shadow" />
          <div className="text-[11px] font-mono text-gray-400">{e.fecha || e.createdAt}</div>
          <div className="text-xs font-semibold text-pj-mid">{e.usuarioNombre || e.usuario?.nombre}</div>
          <div className="text-sm text-gray-700 mt-0.5 leading-relaxed">{e.texto}</div>
        </div>
      ))}
    </div>
  )
}

function StatusFlow({ estado }) {
  const idx = ESTADOS.indexOf(estado)
  return (
    <div className="flex mb-4">
      {ESTADOS.map((s, i) => (
        <div key={s} className={`flex-1 text-center text-xs font-medium py-1.5 border-b-[3px]
          ${i < idx  ? 'text-pj-mid border-pj-mid' :
            i === idx ? 'text-warning border-warning font-semibold' :
                        'text-gray-300 border-gray-200'}`}>
          {s.replace('_', ' ')}
        </div>
      ))}
    </div>
  )
}

export default function Tickets() {
  const { isAdmin, isOperador } = useAuth()
  const canWrite = isAdmin || isOperador
  const { run, loading: saving } = useAsync()

  const [tickets,    setTickets]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [detail,     setDetail]     = useState(null)
  const [detailLoad, setDetailLoad] = useState(false)
  const [search,     setSearch]     = useState('')
  const [fEstado,    setFEstado]    = useState('')
  const [fPrioridad, setFPrioridad] = useState('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [showDetail,   setShowDetail]   = useState(false)
  const [showBitacora, setShowBitacora] = useState(false)
  const [showEdit,     setShowEdit]     = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [errors,   setErrors]   = useState({})
  const [bText,    setBText]    = useState('')
  const [editForm, setEditForm] = useState({ estado: '', prioridad: '', tecnicoId: '' })
  const [juzgados, setJuzgados] = useState([])
  const [tecnicos, setTecnicos] = useState([])

  async function loadTickets() {
    setLoading(true)
    try {
      const res = await ticketsService.listar({ estado: fEstado, prioridad: fPrioridad, search, page: 0, size: 50 })
      const data = res.data?.data
      setTickets(Array.isArray(data) ? data : data?.content ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [fEstado, fPrioridad, search])

  useEffect(() => {
    organizacionService.listarJuzgados().then(r => setJuzgados(r.data?.data ?? []))
    usuariosService.listar({ rol: 'TECNICO', activo: true, size: 100 }).then(r => {
      const d = r.data?.data
      setTecnicos(Array.isArray(d) ? d : d?.content ?? [])
    })
  }, [])

  async function openDetail(t) {
    setSelected(t)
    setShowDetail(true)
    setDetailLoad(true)
    setDetail(null)
    try {
      const res = await ticketsService.obtener(t.id)
      setDetail(res.data?.data ?? res.data)
    } catch (_) {}
    setDetailLoad(false)
  }

  function openEdit(t) {
    setSelected(t)
    setEditForm({ estado: t.estado, prioridad: t.prioridad, tecnicoId: t.tecnico?.id || t.tecnicoId || '' })
    setShowDetail(false)
    setShowEdit(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    try {
      await run(ticketsService.crear({
        descripcion: form.descripcion,
        prioridad:   form.prioridad,
        juzgadoId:   Number(form.juzgadoId),
        tecnicoId:   Number(form.tecnicoId)  || undefined,
        hardwareId:  Number(form.hardwareId) || undefined,
      }))
      showToast('Ticket creado correctamente', 'success')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      loadTickets()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al crear ticket', 'error')
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    try {
      await run(ticketsService.actualizar(selected.id, {
        estado:    editForm.estado    || undefined,
        prioridad: editForm.prioridad || undefined,
        tecnicoId: Number(editForm.tecnicoId) || undefined,
      }))
      showToast('Ticket actualizado', 'success')
      setShowEdit(false)
      loadTickets()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar', 'error')
    }
  }

  async function handleAddBitacora(e) {
    e.preventDefault()
    if (!bText.trim()) return
    try {
      await run(ticketsService.addBitacora(selected.id, { texto: bText }))
      showToast('Entrada agregada a la bitacora', 'success')
      setBText('')
      setShowBitacora(false)
      const res = await ticketsService.obtener(selected.id)
      setDetail(res.data?.data ?? res.data)
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Tickets de Soporte"
        subtitle="Gestion y seguimiento de incidencias tecnicas"
        action={canWrite && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowCreate(true) }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Nuevo ticket
          </button>
        )}
      />

      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar ticket, juzgado..." />
        <select className="filter-select" value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="filter-select" value={fPrioridad} onChange={e => setFPrioridad(e.target.value)}>
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">ID</th>
                <th className="th">Descripcion / Juzgado</th>
                <th className="th">Estado</th>
                <th className="th">Prioridad</th>
                <th className="th">Tecnico</th>
                <th className="th">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-12"><Spinner /></td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="Sin tickets" text="No hay tickets con los filtros actuales." /></td></tr>
              ) : tickets.map(t => (
                <tr key={t.id} className="tr-body" onClick={() => openDetail(t)}>
                  <td className="td font-mono text-xs text-gray-500">#{t.id}</td>
                  <td className="td">
                    <div className="font-medium text-gray-800 truncate max-w-[260px]">{t.descripcion}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.juzgadoNombre || t.juzgado?.nombre}</div>
                  </td>
                  <td className="td"><Badge value={t.estado} /></td>
                  <td className="td"><Badge value={t.prioridad} /></td>
                  <td className="td text-sm text-gray-500">{t.tecnicoNombre || t.tecnico?.nombre || '-'}</td>
                  <td className="td font-mono text-xs text-gray-400">{t.createdAt?.slice(0,10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Ticket de Soporte"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Crear Ticket'}
          </button>
        </>}
      >
        <FormGroup label="Descripcion" required error={errors.descripcion}>
          <textarea
            className={`form-control h-auto py-2 ${errors.descripcion ? 'error' : ''}`}
            rows={3} value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            placeholder="Describa el problema detalladamente..."
          />
        </FormGroup>
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Prioridad">
            <select className="form-control" value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Juzgado" required error={errors.juzgadoId}>
            <select className={`form-control ${errors.juzgadoId ? 'error' : ''}`}
              value={form.juzgadoId} onChange={e => setForm(p => ({ ...p, juzgadoId: e.target.value }))}>
              <option value="">Seleccionar juzgado...</option>
              {juzgados.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Tecnico asignado">
            <select className="form-control" value={form.tecnicoId} onChange={e => setForm(p => ({ ...p, tecnicoId: e.target.value }))}>
              <option value="">Sin asignar</option>
              {tecnicos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Hardware ID">
            <input type="number" className="form-control" value={form.hardwareId}
              onChange={e => setForm(p => ({ ...p, hardwareId: e.target.value }))}
              placeholder="ID del equipo (opcional)" />
          </FormGroup>
        </div>
      </Modal>

      {/* DETAIL */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setDetail(null) }}
        title={`Ticket #${selected?.id}`} wide
        footer={canWrite && (
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => { setShowDetail(false); setShowBitacora(true) }}>
              Agregar Bitacora
            </button>
            <button className="btn btn-primary" onClick={() => detail && openEdit(detail)}>
              Modificar
            </button>
          </div>
        )}
      >
        {detailLoad ? (
          <div className="flex justify-center py-12"><Spinner size={8} /></div>
        ) : detail ? (
          <div className="space-y-4">
            <StatusFlow estado={detail.estado} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['Estado',    <Badge value={detail.estado} />],
                ['Prioridad', <Badge value={detail.prioridad} />],
                ['Juzgado',   detail.juzgado?.nombre || detail.juzgadoNombre || '-'],
                ['Tecnico',   detail.tecnico?.nombre || detail.tecnicoNombre || 'Sin asignar'],
                ['Creado',    detail.createdAt?.slice(0,10) || '-'],
                ['Cerrado',   detail.closedAt?.slice(0,10) || '-'],
              ].map(([label, value], i) => (
                <div key={i}>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-sm text-gray-800">{value}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Descripcion</div>
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-md p-3">{detail.descripcion}</div>
            </div>
            <div className="card">
              <div className="card-title">Bitacora de seguimiento</div>
              <BitacoraTimeline entries={detail.bitacora || detail.historial} />
            </div>
          </div>
        ) : <EmptyState title="Sin datos" text="No se pudo cargar el detalle." />}
      </Modal>

      {/* EDIT */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Modificar Ticket #${selected?.id}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
            {saving ? <Spinner size={4} /> : 'Guardar cambios'}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Estado">
            <select className="form-control" value={editForm.estado} onChange={e => setEditForm(p => ({ ...p, estado: e.target.value }))}>
              {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Prioridad">
            <select className="form-control" value={editForm.prioridad} onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value }))}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Tecnico asignado">
            <select className="form-control" value={editForm.tecnicoId} onChange={e => setEditForm(p => ({ ...p, tecnicoId: e.target.value }))}>
              <option value="">Sin asignar</option>
              {tecnicos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </FormGroup>
        </div>
      </Modal>

      {/* BITACORA */}
      <Modal open={showBitacora} onClose={() => setShowBitacora(false)}
        title={`Agregar a Bitacora — Ticket #${selected?.id}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowBitacora(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleAddBitacora} disabled={saving || !bText.trim()}>
            {saving ? <Spinner size={4} /> : 'Guardar entrada'}
          </button>
        </>}
      >
        <FormGroup label="Descripcion de la accion" required>
          <textarea className="form-control h-auto py-2" rows={4} value={bText}
            onChange={e => setBText(e.target.value)}
            placeholder="Describa la accion o avance realizado..." autoFocus />
        </FormGroup>
      </Modal>
    </div>
  )
}
