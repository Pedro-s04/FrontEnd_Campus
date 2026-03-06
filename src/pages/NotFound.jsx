import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl font-bold text-gray-200 font-mono leading-none mb-4">404</div>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Pagina no encontrada</h1>
        <p className="text-sm text-gray-400 mb-6">La ruta solicitada no existe en el sistema.</p>
        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
