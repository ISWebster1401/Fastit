import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-center mb-6 text-[#64748b] dark:text-white/30">
        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <p className="text-[#94a3b8] dark:text-white/25 text-sm font-mono mb-2">404</p>
      <h1 className="text-3xl font-semibold text-[#0f172a] dark:text-white mb-3">
        Página no encontrada
      </h1>
      <p className="text-[#64748b] dark:text-white/40 text-sm max-w-sm mb-8">
        La URL que buscas no existe o fue movida. Puedes volver al inicio o explorar el catálogo.
      </p>

      <div className="flex gap-3">
        <Link to="/" className="btn-primary">Ir al inicio</Link>
        <Link to="/catalog" className="btn-secondary">Ver catálogo</Link>
      </div>
    </div>
  )
}
