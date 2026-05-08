import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../../store/cartStore'
import { useTheme } from '../../hooks/useTheme'
import CurrencySelector from './CurrencySelector'
import { resendVerification } from '../../api/client'

export default function Navbar() {
  const items    = useCartStore(s => s.items)
  const count    = items.reduce((sum, i) => sum + i.quantity, 0)
  const user     = useAuthStore(s => s.user)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()

  const handleLogout = () => { logout(); navigate('/') }
  const [resendDone, setResendDone] = useState(false)
  const handleResend = () => resendVerification().then(() => setResendDone(true)).catch(() => {})

  const displayName = user
    ? (user.is_company && user.business_name ? user.business_name : user.email)
    : null
  const initial = displayName?.[0]?.toUpperCase()

  return (
    <header className="bg-white/90 dark:bg-[#04080f]/95 backdrop-blur-xl border-b border-[#e2e8f0]/80 dark:border-white/[0.06] sticky top-0 z-50 transition-colors duration-300">
      <div className="border-b border-[#e2e8f0]/60 dark:border-white/[0.04] text-[#64748b] dark:text-white/25 text-xs text-center py-1.5 tracking-wide">
        Fast-IT | Hardware crítico con asesoría experta
      </div>

      {/* Banner verificación pendiente */}
      {user && !user.email_verified && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20
                        px-4 py-2 flex items-center justify-center gap-3 text-xs">
          <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <span className="text-amber-800 dark:text-amber-300">
            Verifica tu correo para habilitar los pagos.
          </span>
          {resendDone ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">¡Enviado!</span>
          ) : (
            <button onClick={handleResend}
              className="text-amber-700 dark:text-amber-300 font-semibold underline hover:no-underline transition-all">
              Reenviar email
            </button>
          )}
        </div>
      )}

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-[#1e40af] dark:bg-blue-500 rounded-xl flex items-center justify-center font-bold text-white text-sm transition-all duration-300 group-hover:bg-[#1d4ed8] dark:group-hover:bg-blue-400">
            F
          </div>
          <div className="leading-none">
            <span className="block font-semibold text-[#0f172a] dark:text-white text-base tracking-tight">Fast-IT</span>
            <span className="block text-[#94a3b8] dark:text-white/25 text-[10px] tracking-widest uppercase">Hardware crítico</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          <NavLink to="/catalog">Catálogo</NavLink>
          <NavLink to="/advisor">Solución a tu medida</NavLink>
          {user && <NavLink to="/orders">Mis Órdenes</NavLink>}
          {user?.is_admin && <NavLink to="/admin">Admin</NavLink>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Selector de moneda */}
          <CurrencySelector />

          {/* Toggle tema */}
          <button
            onClick={toggle}
            aria-label="Cambiar tema"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748b] dark:text-white/40
                       hover:bg-[#f1f5f9] dark:hover:bg-white/[0.06] hover:text-[#0f172a] dark:hover:text-white
                       transition-all duration-200"
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            )}
          </button>

          {/* Usuario */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 bg-white dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] rounded-full px-2.5 py-1.5">
                <div className="w-5 h-5 rounded-full bg-[#1e40af] dark:bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {initial}
                </div>
                <span className="text-xs text-[#0f172a] dark:text-white/70 hidden sm:block max-w-[120px] truncate">
                  {displayName}
                </span>
              </div>
              <button onClick={handleLogout}
                className="text-xs text-[#64748b] dark:text-white/30 hover:text-[#1e40af] dark:hover:text-white transition-colors px-2 py-1.5">
                Salir
              </button>
            </div>
          ) : (
            <Link to="/login"
              className="text-sm text-[#0f172a] dark:text-white/60 hover:text-[#1e40af] dark:hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-[#f1f5f9] dark:hover:bg-white/[0.06] border border-transparent hover:border-[#e2e8f0] dark:hover:border-white/[0.08]">
              Ingresar
            </Link>
          )}

          {/* Carrito */}
          <Link to="/checkout"
            className="relative flex items-center gap-2 bg-[#1e40af] dark:bg-blue-500 hover:bg-[#1d4ed8] dark:hover:bg-blue-400 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 active:scale-[0.97]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="bg-white text-[#1e40af] dark:text-blue-500 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {count}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </header>
  )
}

function NavLink({ to, children }) {
  const { pathname } = useLocation()
  const isActive = pathname === to || pathname.startsWith(to + '/')
  return (
    <Link to={to}
      className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 whitespace-nowrap ${
        isActive
          ? 'bg-[#eff6ff] dark:bg-blue-500/[0.15] text-[#1e40af] dark:text-blue-400 font-medium'
          : 'text-[#0f172a] dark:text-white/60 hover:text-[#1e40af] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-white/[0.05]'
      }`}>
      {children}
    </Link>
  )
}
