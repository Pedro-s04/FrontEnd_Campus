import { useEffect, useState } from 'react'
import { ticketsService, organizacionService, usuariosService } from '../services'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, showToast } from '../components'

const ESTADOS     = ['solicitado', 'asignado', 'en_curso', 'cerrado']
const PRIORIDADES = ['alta', 'media', 'baja']
const CATEGORIAS  = [
  { label: 'PC / Notebook', value: 'hardware_pc' },
  { label: 'Impresora', value: 'hardware_impresora' },
  { label: 'Red (router/switch)', value: 'hardware_red' },
  { label: 'Software', value: 'software' },
  { label: 'Conectividad / Internet', value: 'conectividad' },
  { label: 'Otro', value: 'otro' },
]
const EMPTY_FORM  = { descripcion: '', categoria: '', prioridad: 'media', juzgadoId: '', tecnicoId: '', hardwareId: '' }

const normalizeTicketValue = (value) => (value || '').toLowerCase()
const formatEnum = (value) => (value || '').toLowerCase().replace('_', ' ')
const getApiError = (err, fallback) => err.response?.data?.error?.message || err.response?.data?.message || fallback
const getValidationDetail = (err) => err.response?.data?.error?.details?.[0]?.message

function normalizeRole(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^ROLE_/i, '')
    .toUpperCase()
}

function onlyActiveTecnicos(list = []) {
  return (list || []).filter((u) => {
    const rol = normalizeRole(u?.rol?.nombre || u?.rol || u?.rolNombre || u?.role)
    const activo = u?.activo
    return rol === 'TECNICO' && activo !== false
  })
}

function validate(form) {
  const e = {}
  if (!form.descripcion.trim())            e.descripcion = 'La descripcion es obligatoria.'
  else if (form.descripcion.trim().length < 10) e.descripcion = 'Minimo 10 caracteres.'
  if (!form.categoria.trim())              e.categoria   = 'La categoria es obligatoria.'
  if (!form.juzgadoId)                     e.juzgadoId   = 'Seleccione un juzgado.'

  if (form.tecnicoId) {
    const tecnicoId = Number(form.tecnicoId)
    if (!Number.isInteger(tecnicoId) || tecnicoId <= 0) {
      e.tecnicoId = 'El tecnico debe ser un ID valido.'
    }
  }

  if (form.hardwareId) {
    const hardwareId = Number(form.hardwareId)
    if (!Number.isInteger(hardwareId) || hardwareId <= 0) {
      e.hardwareId = 'El Hardware ID debe ser un entero positivo.'
    }
  }

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
  const idx = ESTADOS.indexOf(normalizeTicketValue(estado))
  return (
    <div className="flex mb-4">
      {ESTADOS.map((s, i) => (
        <div key={s} className={`flex-1 text-center text-xs font-medium py-1.5 border-b-[3px]
          ${i < idx  ? 'text-pj-mid border-pj-mid' :
            i === idx ? 'text-warning border-warning font-semibold' :
                        'text-gray-300 border-gray-200'}`}>
          {formatEnum(s)}
        </div>
      ))}
    </div>
  )
}

export default function Tickets() {
  const { user, isAdmin, isOperador, isTecnico } = useAuth()
  const canWrite = isAdmin || isOperador
  const { run, loading: saving } = useAsync()

  const [tickets,    setTickets]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [detail,     setDetail]     = useState(null)
  const [detailLoad, setDetailLoad] = useState(false)
  const [search,     setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fEstado,    setFEstado]    = useState('')
  const [fPrioridad, setFPrioridad] = useState('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [showDetail,   setShowDetail]   = useState(false)
  const [showBitacora, setShowBitacora] = useState(false)
  const [showEdit,     setShowEdit]     = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [errors,   setErrors]   = useState({})
  const [bText,    setBText]    = useState('')
  const [editForm, setEditForm] = useState({ estado: '', prioridad: '', tecnicoId: '', resolucion: '' })
  const [juzgados, setJuzgados] = useState([])
  const [tecnicos, setTecnicos] = useState([])

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  async function loadTickets() {
    setLoading(true)
    try {
      const params = {
        page: 0,
        size: 50,
      }

      if (ESTADOS.includes(fEstado)) params.estado = fEstado
      if (PRIORIDADES.includes(fPrioridad)) params.prioridad = fPrioridad
      if (debouncedSearch) params.search = debouncedSearch
      if (isTecnico) {
        const tecnicoId = Number(user?.id)
        if (!Number.isNaN(tecnicoId) && tecnicoId > 0) {
          params.tecnicoId = tecnicoId
        }
      }

      const res = await ticketsService.listar(params)
      const data = res.data?.data
      setTickets(Array.isArray(data) ? data : data?.content ?? [])
    } catch (err) {
      showToast(getApiError(err, 'Error al cargar tickets'), 'error')
      setTickets([])
    }
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [fEstado, fPrioridad, debouncedSearch, isTecnico, user?.id])

  useEffect(() => {
    if (!canWrite) return

    organizacionService
      .listarJuzgados()
      .then(r => setJuzgados(r.data?.data ?? []))
      .catch(err => showToast(getApiError(err, 'No se pudieron cargar juzgados'), 'error'))

    usuariosService
      .listar({ rol: 'TECNICO', activo: true, size: 100 })
      .then(r => {
        const d = r.data?.data
        const list = Array.isArray(d) ? d : d?.content ?? []
        setTecnicos(onlyActiveTecnicos(list))
      })
      .catch(err => showToast(getApiError(err, 'No se pudieron cargar tecnicos'), 'error'))
  }, [canWrite])

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
    setEditForm({
      estado: normalizeTicketValue(t.estado),
      prioridad: normalizeTicketValue(t.prioridad),
      tecnicoId: t.tecnico?.id || t.tecnicoId || '',
      resolucion: t.resolucion || '',
    })
    setShowDetail(false)
    setShowEdit(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    try {
      const basePayload = {
        descripcion: form.descripcion.trim(),
        juzgadoId: Number(form.juzgadoId),
      }

      if (form.tecnicoId) {
        const tecnicoId = Number(form.tecnicoId)
        if (Number.isInteger(tecnicoId) && tecnicoId > 0) basePayload.tecnicoId = tecnicoId
      }

      if (form.hardwareId) {
        const hardwareId = Number(form.hardwareId)
        if (Number.isInteger(hardwareId) && hardwareId > 0) basePayload.hardwareId = hardwareId
      }

      const payload = {
        ...basePayload,
        categoria: form.categoria,
        prioridad: normalizeTicketValue(form.prioridad),
      }

      await run(ticketsService.crear(payload))

      showToast('Ticket creado correctamente', 'success')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      loadTickets()
    } catch (err) {
      showToast(getValidationDetail(err) || getApiError(err, 'Error al crear ticket'), 'error')
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const descripcionValue = (detail?.descripcion || selected?.descripcion || '').trim()
    const juzgadoValue = Number(detail?.juzgado?.id || detail?.juzgadoId || selected?.juzgado?.id || selected?.juzgadoId || 0)
    const previousEstado = normalizeTicketValue(detail?.estado || selected?.estado)

    if (descripcionValue.length < 10) {
      showToast('La descripcion debe tener al menos 10 caracteres.', 'error')
      return
    }

    if (!juzgadoValue) {
      showToast('El ticket debe tener juzgado asignado.', 'error')
      return
    }

    if (editForm.estado === 'cerrado' && !editForm.resolucion?.trim()) {
      showToast('Para cerrar el ticket debes ingresar una resolucion.', 'error')
      return
    }

    try {
      const payload = {
        descripcion: descripcionValue,
        estado: editForm.estado ? normalizeTicketValue(editForm.estado) : undefined,
        prioridad: editForm.prioridad ? normalizeTicketValue(editForm.prioridad) : undefined,
        juzgadoId: juzgadoValue,
      }

      if (editForm.estado === 'cerrado') {
        payload.resolucion = editForm.resolucion.trim()
      }

      if (editForm.tecnicoId) payload.tecnicoId = Number(editForm.tecnicoId)
      const hardwareIdValue = detail?.hardware?.id || detail?.hardwareId || selected?.hardware?.id || selected?.hardwareId
      if (hardwareIdValue) payload.hardwareId = Number(hardwareIdValue)

      await run(ticketsService.actualizar(selected.id, payload))

      // Deja trazabilidad explicita en bitacora al momento del cierre.
      if (editForm.estado === 'cerrado' && previousEstado !== 'cerrado' && payload.resolucion) {
        try {
          await run(ticketsService.addBitacora(selected.id, {
            texto: `Cierre de ticket. Resolucion: ${payload.resolucion}`,
          }))
        } catch (_) {
          showToast('El ticket se cerro, pero no se pudo registrar la resolucion en bitacora.', 'warning')
        }
      }

      showToast('Ticket actualizado', 'success')
      setShowEdit(false)
      loadTickets()
    } catch (err) {
      showToast(getValidationDetail(err) || getApiError(err, 'Error al actualizar'), 'error')
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
      showToast(getApiError(err, 'Error'), 'error')
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
          {ESTADOS.map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
        </select>
        <select className="filter-select" value={fPrioridad} onChange={e => setFPrioridad(e.target.value)}>
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p} value={p}>{formatEnum(p)}</option>)}
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
        <FormGroup label="Categoria" required error={errors.categoria}>
          <select
            className={`form-control ${errors.categoria ? 'error' : ''}`}
            value={form.categoria}
            onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
          >
            <option value="">Seleccionar categoria...</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormGroup>
        <div className="grid grid-cols-2 gap-3.5">
          <FormGroup label="Prioridad">
            <select className="form-control" value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{formatEnum(p)}</option>)}
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
            {errors.tecnicoId && <p className="text-xs text-danger mt-1">{errors.tecnicoId}</p>}
          </FormGroup>
          <FormGroup label="Hardware ID">
            <input type="number" className="form-control" value={form.hardwareId}
              onChange={e => setForm(p => ({ ...p, hardwareId: e.target.value }))}
              placeholder="ID del equipo (opcional)" />
            {errors.hardwareId && <p className="text-xs text-danger mt-1">{errors.hardwareId}</p>}
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
              {ESTADOS.map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Prioridad">
            <select className="form-control" value={editForm.prioridad} onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value }))}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{formatEnum(p)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Tecnico asignado">
            <select className="form-control" value={editForm.tecnicoId} onChange={e => setEditForm(p => ({ ...p, tecnicoId: e.target.value }))}>
              <option value="">Sin asignar</option>
              {tecnicos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </FormGroup>
        </div>
        {editForm.estado === 'cerrado' && (
          <FormGroup label="Resolucion" required>
            <textarea
              className="form-control h-auto py-2"
              rows={3}
              value={editForm.resolucion ?? ''}
              onChange={e => setEditForm(p => ({ ...p, resolucion: e.target.value }))}
              placeholder="Detalle de la resolucion aplicada..."
              autoFocus
            />
          </FormGroup>
        )}
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
