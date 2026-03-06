import { useEffect, useState } from 'react'
import { dashboardService } from '../services'
import { PageHeader, StatCard, Spinner, EmptyState } from '../components'

function DashCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3.5">{title}</div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [stats,    setStats]    = useState(null)
  const [juzgados, setJuzgados] = useState([])
  const [contratos,setContratos]= useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [s, j, c] = await Promise.all([
          dashboardService.stats(),
          dashboardService.ticketsPorJuzgado(),
          dashboardService.contratosVencer(90),
        ])
        setStats(s.data?.data ?? s.data)
        setJuzgados(j.data?.data ?? j.data ?? [])
        setContratos(c.data?.data ?? c.data ?? [])
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex justify-center pt-20"><Spinner size={8} /></div>
  )

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Indicadores globales del sistema" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Tickets Abiertos"    value={stats?.ticketsAbiertos    ?? '-'} variant="danger"  sub="activos" />
        <StatCard label="Tickets en Curso"    value={stats?.ticketsEnCurso     ?? '-'} variant="warning" sub="en atencion" />
        <StatCard label="Equipos Registrados" value={stats?.equiposRegistrados ?? '-'} sub="inventario" />
        <StatCard label="Contratos Vigentes"  value={stats?.contratosVigentes  ?? '-'} variant="success" sub="activos" />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}
