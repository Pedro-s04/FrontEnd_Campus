import { useEffect, useState } from 'react'
import { dashboardService, ticketsService } from '../services'
import { useAuth } from '../context/AuthContext'
import { PageHeader, StatCard, Spinner, EmptyState, showToast } from '../components'

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const firstNumber = (...values) => {
  for (const value of values) {
    const n = toNumber(value)
    if (n !== null) return n
  }
  return null
}

const normalizeText = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const normalizeEstado = (value) => normalizeText(value).replace(/[\s-]+/g, '_')

function getUserJuzgadoScope(user) {
  const id = user?.juzgado?.id ?? user?.juzgadoId ?? user?.idJuzgado ?? null
  const nombreRaw = user?.juzgado?.nombre ?? user?.juzgadoNombre ?? user?.nombreJuzgado ?? ''
  const nombre = normalizeText(nombreRaw)
  return {
    id: id ? String(id) : '',
    nombre,
    label: nombreRaw || '',
  }
}

function extractJuzgadoScope(item) {
  const id =
    item?.juzgado?.id ??
    item?.juzgadoId ??
    item?.idJuzgado ??
    item?.juzgado?.value ??
    null

  const nombreRaw =
    item?.juzgado?.nombre ??
    item?.juzgadoNombre ??
    item?.nombreJuzgado ??
    item?.juzgado ??
    item?.nombre ??
    ''

  return {
    id: id ? String(id) : '',
    nombre: normalizeText(nombreRaw),
  }
}

function belongsToJuzgado(item, userScope, allowWhenUnknown = false) {
  if (!userScope?.id && !userScope?.nombre) return true
  const itemScope = extractJuzgadoScope(item)
  if (!itemScope.id && !itemScope.nombre) return allowWhenUnknown
  if (userScope.id && itemScope.id) return itemScope.id === userScope.id
  if (userScope.nombre && itemScope.nombre) return itemScope.nombre === userScope.nombre
  return false
}

function normalizeTicketsResponse(raw) {
  const source = raw || []
  return Array.isArray(source) ? source : source?.content ?? []
}

function statsFromTickets(tickets = []) {
  const abiertos = tickets.filter((t) => {
    const estado = normalizeEstado(t?.estado)
    return ['solicitado', 'asignado', 'en_curso', 'abierto'].includes(estado)
  }).length

  const enCurso = tickets.filter((t) => normalizeEstado(t?.estado) === 'en_curso').length

  return {
    ticketsAbiertos: abiertos,
    ticketsEnCurso: enCurso,
  }
}

function normalizeStats(raw) {
  const source = raw || {}

  const abiertosDerivados =
    Number(source.ticketsSolicitados ?? 0) +
    Number(source.ticketsAsignados ?? 0) +
    Number(source.ticketsEnCurso ?? 0)

  return {
    ticketsAbiertos: firstNumber(source.ticketsAbiertos, abiertosDerivados),
    ticketsEnCurso: firstNumber(source.ticketsEnCurso),
    equiposRegistrados: firstNumber(source.equiposRegistrados, source.hwTotal),
    contratosVigentes: firstNumber(source.contratosVigentes),
  }
}

function normalizeJuzgado(item) {
  return {
    juzgado:
      item?.juzgado ??
      item?.juzgadoNombre ??
      item?.nombreJuzgado ??
      item?.nombre ??
      '-',
    totalAbiertos: firstNumber(
      item?.totalAbiertos,
      item?.cantidadAbiertos,
      item?.ticketsAbiertos,
      item?.cantidad,
      item?.total
    ) ?? 0,
  }
}

function normalizeContrato(item) {
  return {
    proveedor: item?.proveedor ?? item?.proveedorNombre ?? item?.nombreProveedor ?? '-',
    cobertura: item?.cobertura ?? item?.detalle ?? item?.descripcion ?? '-',
    fechaVencimiento: item?.fechaVencimiento ?? item?.fechaFin ?? item?.vencimiento ?? '-',
    juzgadoId: item?.juzgado?.id ?? item?.juzgadoId ?? item?.idJuzgado ?? null,
    juzgadoNombre: item?.juzgado?.nombre ?? item?.juzgadoNombre ?? item?.nombreJuzgado ?? '',
  }
}

const getApiError = (err, fallback) => err.response?.data?.error?.message || err.response?.data?.message || fallback

function DashCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3.5">{title}</div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { user, isOperador, isTecnico } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [juzgados, setJuzgados] = useState([])
  const [contratos,setContratos]= useState([])
  const [loading,  setLoading]  = useState(true)

  const userJuzgado = getUserJuzgadoScope(user)
  const operadorConJuzgado = isOperador && Boolean(userJuzgado.id || userJuzgado.nombre)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        if (isTecnico) {
          const tecnicoId = Number(user?.id)
          const ticketParams = { page: 0, size: 500 }
          if (Number.isInteger(tecnicoId) && tecnicoId > 0) ticketParams.tecnicoId = tecnicoId

          const t = await ticketsService.listar(ticketParams)
          const ticketsPayload = normalizeTicketsResponse(t.data?.data ?? t.data)
          const ticketStats = statsFromTickets(ticketsPayload)

          setStats({
            ticketsAbiertos: ticketStats.ticketsAbiertos,
            ticketsEnCurso: ticketStats.ticketsEnCurso,
            equiposRegistrados: null,
            contratosVigentes: null,
          })
          setJuzgados([])
          setContratos([])
        } else {
          const dashboardParams = operadorConJuzgado && userJuzgado.id
            ? { juzgadoId: Number(userJuzgado.id) }
            : undefined

          const requests = [
            dashboardService.stats(dashboardParams),
            dashboardService.ticketsPorJuzgado(dashboardParams),
            dashboardService.contratosVencer(90, dashboardParams),
          ]

          if (operadorConJuzgado) {
            const ticketParams = { page: 0, size: 500 }
            if (userJuzgado.id) ticketParams.juzgadoId = Number(userJuzgado.id)
            requests.push(ticketsService.listar(ticketParams))
          }

          const [s, j, c, t] = await Promise.all(requests)

          const statsPayload = s.data?.data ?? s.data ?? {}
          const juzgadosPayload = j.data?.data ?? j.data ?? []
          const contratosPayload = c.data?.data ?? c.data ?? []

          const normalizedStats = normalizeStats(statsPayload)
          let normalizedJuzgados = Array.isArray(juzgadosPayload) ? juzgadosPayload.map(normalizeJuzgado) : []
          let normalizedContratos = Array.isArray(contratosPayload) ? contratosPayload.map(normalizeContrato) : []

          if (operadorConJuzgado) {
            normalizedJuzgados = normalizedJuzgados.filter((item) => belongsToJuzgado(item, userJuzgado))
            normalizedContratos = normalizedContratos.filter((item) => belongsToJuzgado(item, userJuzgado, true))

            if (t) {
              const ticketsPayload = normalizeTicketsResponse(t.data?.data ?? t.data)
              const filteredTickets = ticketsPayload.filter((item) => belongsToJuzgado(item, userJuzgado))
              const ticketStats = statsFromTickets(filteredTickets)
              normalizedStats.ticketsAbiertos = ticketStats.ticketsAbiertos
              normalizedStats.ticketsEnCurso = ticketStats.ticketsEnCurso
            }
          }

          setStats(normalizedStats)
          setJuzgados(normalizedJuzgados)
          setContratos(normalizedContratos)
        }
      } catch (err) {
        setStats(null)
        setJuzgados([])
        setContratos([])
        showToast(getApiError(err, 'No se pudo cargar el dashboard'), 'error')
      }
      setLoading(false)
    }
    load()
  }, [isOperador, isTecnico, operadorConJuzgado, user?.id, userJuzgado.id, userJuzgado.nombre])

  if (loading) return (
    <div className="flex justify-center pt-20"><Spinner size={8} /></div>
  )

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          isTecnico
            ? 'Resumen de tickets asignados'
            : operadorConJuzgado
              ? `Indicadores del juzgado ${userJuzgado.label || 'asignado'}`
              : 'Indicadores globales del sistema'
        }
      />

      {/* Stats */}
      <div className={`grid gap-3.5 mb-5 ${isTecnico ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
        <StatCard label="Tickets Abiertos"    value={stats?.ticketsAbiertos    ?? '-'} variant="danger"  sub="activos" />
        <StatCard label="Tickets en Curso"    value={stats?.ticketsEnCurso     ?? '-'} variant="warning" sub="en atencion" />
        {!isTecnico && <StatCard label="Equipos Registrados" value={stats?.equiposRegistrados ?? '-'} sub="inventario" />}
        {!isTecnico && <StatCard label="Contratos Vigentes"  value={stats?.contratosVigentes  ?? '-'} variant="success" sub="activos" />}
      </div>

      {!isTecnico && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Tickets por juzgado */}
        <DashCard title="Tickets Abiertos por Juzgado">
          {juzgados.length === 0 ? (
            <EmptyState title="Sin datos" text="No hay tickets por juzgado." />
          ) : (
            <div>
              {juzgados.slice(0, 8).map((j, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-700 truncate max-w-[200px]">{j.juzgado}</span>
                  <span className="font-mono text-xs text-gray-500 ml-2">{j.totalAbiertos}</span>
                </div>
              ))}
            </div>
          )}
        </DashCard>

        {/* Contratos por vencer */}
        <DashCard title="Contratos Proximos a Vencer (90 dias)">
          {contratos.length === 0 ? (
            <EmptyState title="Sin contratos proximos" text="No hay contratos por vencer en 90 dias." />
          ) : (
            <div>
              {contratos.slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                  <div>
                    <div className="text-gray-700 font-medium">{c.proveedor}</div>
                    <div className="text-xs text-gray-400">{c.cobertura}</div>
                  </div>
                  <span className="text-xs font-mono text-warning ml-2 whitespace-nowrap">
                    {c.fechaVencimiento}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashCard>
      </div>
      )}
    </div>
  )
}
