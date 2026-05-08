import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/client'

export default function ResetPasswordPage() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const token       = params.get('token') || ''

  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [status, setStatus]         = useState('idle')
  const [error, setError]           = useState('')

  if (!token) {
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
            El enlace de recuperación es inválido. Solicita uno nuevo.
          </p>
        </div>
        <Link to="/forgot-password" className="btn-secondary px-8 inline-block">
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setStatus('loading')
    try {
      await resetPassword(token, password)
      setStatus('success')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setStatus('idle')
      setError(err?.response?.data?.detail || 'Token inválido o expirado. Solicita un nuevo enlace.')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
                        rounded-full flex items-center justify-center mx-auto">
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">¡Contraseña actualizada!</h1>
          <p className="text-[#6e6e73] dark:text-white/40 text-sm mt-2">
            Te redirigiremos al login en un momento…
          </p>
        </div>
        <Link to="/login" className="btn-primary px-8 inline-block">Ir al login</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
          Crea una nueva contraseña
        </h1>
        <p className="text-sm text-[#64748b] dark:text-white/50">
          Elige una contraseña segura de al menos 8 caracteres.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#0f172a] dark:text-white/80 mb-1.5">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full h-11 px-3 rounded-[10px] border border-[#e2e8f0] bg-white dark:bg-white/5
                       text-[14px] text-[#0f172a] dark:text-white placeholder:text-[#94a3b8]
                       focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#0f172a] dark:text-white/80 mb-1.5">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className="w-full h-11 px-3 rounded-[10px] border border-[#e2e8f0] bg-white dark:bg-white/5
                       text-[14px] text-[#0f172a] dark:text-white placeholder:text-[#94a3b8]
                       focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]"
          />
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary w-full py-3"
        >
          {status === 'loading' ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  )
}
