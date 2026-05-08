import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Ingresa tu email')
      return
    }
    setError('')
    setStatus('loading')
    try {
      await forgotPassword(email.trim().toLowerCase())
      setStatus('sent')
    } catch (err) {
      setStatus('idle')
      setError(err?.response?.data?.detail || 'No se pudo procesar la solicitud. Intenta nuevamente.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
                        rounded-full flex items-center justify-center mx-auto">
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Revisa tu correo</h1>
          <p className="text-[#6e6e73] dark:text-white/40 text-sm mt-2">
            Si el email está registrado, te enviamos un enlace para restablecer tu contraseña.
            El enlace expira en 1 hora.
          </p>
        </div>
        <Link to="/login" className="btn-secondary px-8 inline-block">Volver al login</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-[#64748b] dark:text-white/50">
          Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#0f172a] dark:text-white/80 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            className="w-full h-11 px-3 rounded-[10px] border border-[#e2e8f0] bg-white dark:bg-white/5
                       text-[14px] text-[#0f172a] dark:text-white placeholder:text-[#94a3b8]
                       focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]"
            autoFocus
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
          {status === 'loading' ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </button>

        <p className="text-center text-[13px] text-[#64748b] dark:text-white/50">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/login" className="font-medium text-[#1e40af] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
