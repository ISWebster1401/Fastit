import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyEmail } from '../api/client'

export default function VerifyEmailPage() {
  const [params]  = useSearchParams()
  const token     = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  if (status === 'loading') return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <div className="flex justify-center gap-2">
        {[0, 120, 240].map(d => (
          <div key={d} className="w-2.5 h-2.5 rounded-full bg-[#1e40af] animate-bounce"
               style={{ animationDelay: `${d}ms` }}/>
        ))}
      </div>
      <p className="text-[#6e6e73] dark:text-white/40 text-sm">Verificando tu correo…</p>
    </div>
  )

  if (status === 'success') return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
                      rounded-full flex items-center justify-center mx-auto">
        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">¡Correo verificado!</h1>
        <p className="text-[#6e6e73] dark:text-white/40 text-sm mt-2">
          Tu cuenta Fast-IT está activa. Ya puedes realizar pedidos.
        </p>
      </div>
      <Link to="/catalog" className="btn-primary px-8 inline-block">Ir al catálogo</Link>
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400
                      rounded-full flex items-center justify-center mx-auto">
        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Link inválido</h1>
        <p className="text-[#6e6e73] dark:text-white/40 text-sm mt-2">
          El enlace de verificación es inválido o ya fue utilizado.
        </p>
      </div>
      <Link to="/" className="btn-secondary px-8 inline-block">Volver al inicio</Link>
    </div>
  )
}
