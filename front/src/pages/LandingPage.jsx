import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/cartStore'

const CATEGORIES = [
  {
    id: 'servers',
    label: 'Servidores',
    desc: 'HPE ProLiant · Dell PowerEdge · Cisco UCS',
    href: '/catalog?cat=servers',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/>
      </svg>
    ),
    hoverGrad: 'from-blue-100/80 to-blue-50/20 dark:from-blue-500/20 dark:to-blue-600/5',
    accent: 'text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-300 dark:hover:border-blue-500/30',
  },
  {
    id: 'storage',
    label: 'Storage',
    desc: 'NetApp AFF · HPE MSA · SAN/NAS/NVMe',
    href: '/catalog?cat=storage',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16"/>
      </svg>
    ),
    hoverGrad: 'from-violet-100/80 to-violet-50/20 dark:from-violet-500/20 dark:to-violet-600/5',
    accent: 'text-violet-600 dark:text-violet-400',
    border: 'hover:border-violet-300 dark:hover:border-violet-500/30',
  },
  {
    id: 'networking',
    label: 'Redes',
    desc: 'Cisco Catalyst · Meraki · Switching L3',
    href: '/catalog?cat=networking',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
      </svg>
    ),
    hoverGrad: 'from-cyan-100/80 to-cyan-50/20 dark:from-cyan-500/20 dark:to-cyan-600/5',
    accent: 'text-cyan-600 dark:text-cyan-400',
    border: 'hover:border-cyan-300 dark:hover:border-cyan-500/30',
  },
  {
    id: 'workstations',
    label: 'Workstations',
    desc: 'Dell Precision · GPU Profesional · CAD/IA',
    href: '/product/DELL-PREC-7960-WS1',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
    hoverGrad: 'from-emerald-100/80 to-emerald-50/20 dark:from-emerald-500/20 dark:to-emerald-600/5',
    accent: 'text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-300 dark:hover:border-emerald-500/30',
  },
]

const BRANDS = ['HPE', 'Cisco', 'Dell', 'NetApp', 'Samsung', 'Intel', 'NVIDIA', 'Seagate']

const VALUE_PROPS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
    title: 'Asesor IA técnico',
    desc: 'GPT-4o diagnostica tu carga de trabajo y te recomienda el hardware exacto. Sin overselling.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-400/10',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    ),
    title: 'Marcas enterprise certificadas',
    desc: 'Solo distribución oficial. HPE, Cisco, Dell, NetApp con garantía de fabricante y soporte NBD.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-400/10',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/>
      </svg>
    ),
    title: 'Boleta y Factura',
    desc: 'Compra con boleta personal o factura empresa. Pago seguro con Webpay y soporte directo.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-400/10',
  },
]

export default function LandingPage() {
  const user = useAuthStore(s => s.user)

  return (
    <div className="bg-white dark:bg-[#04080f] text-gray-900 dark:text-white overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-20 pb-28 text-center overflow-hidden">

        {/* Background glows — dark mode */}
        <div className="pointer-events-none absolute inset-0 hidden dark:block">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
               style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.18) 0%, transparent 65%)' }}/>
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px]"
               style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 65%)' }}/>
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px]"
               style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 65%)' }}/>
          <div className="absolute inset-0 opacity-[0.025]"
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        </div>

        {/* Background glows — light mode */}
        <div className="pointer-events-none absolute inset-0 block dark:hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
               style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.07) 0%, transparent 65%)' }}/>
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px]"
               style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.05) 0%, transparent 65%)' }}/>
          <div className="absolute inset-0 opacity-[0.015]"
               style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        </div>

        {/* Badge */}
        <div className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 px-4 py-1.5 text-xs text-blue-600 dark:text-blue-300/80 font-medium tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"/>
          Hardware crítico, asesoría experta
        </div>

        {/* Headline */}
        <h1 className="relative max-w-4xl text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.08] mb-6 text-gray-900 dark:text-white">
          Infraestructura crítica.
          <br/>
          <span className="bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 dark:from-blue-400 dark:via-blue-300 dark:to-cyan-300 bg-clip-text text-transparent">
            Entregada.
          </span>
        </h1>

        <p className="relative max-w-xl text-gray-500 dark:text-white/40 text-lg sm:text-xl leading-relaxed mb-10">
          Servidores, storage y redes enterprise.
          Sin bodega, sin sobreprecio, con asesoría técnica real.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/catalog"
            className="px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.97] shadow-lg shadow-blue-500/30"
          >
            Ver catálogo →
          </Link>
          <Link
            to="/advisor"
            className="px-7 py-3.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/25 bg-gray-50 dark:bg-white/[0.04] font-medium text-sm transition-all duration-200 active:scale-[0.97]"
          >
            Solución a tu medida
          </Link>
        </div>

        {/* Brands ticker */}
        <div className="relative mt-16 w-full max-w-2xl">
          <p className="text-gray-400 dark:text-white/15 text-xs uppercase tracking-[0.2em] mb-5">
            Marcas certificadas
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {BRANDS.map(b => (
              <span key={b} className="text-gray-300 dark:text-white/20 text-sm font-semibold tracking-wide hover:text-gray-500 dark:hover:text-white/40 transition-colors">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <div className="border-y border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { value: '8+',    label: 'Marcas enterprise' },
            { value: 'Webpay', label: 'Pago seguro' },
            { value: 'GPT-4o', label: 'Asesor técnico IA' },
            { value: 'Stock',  label: 'Tiempo real' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{s.value}</p>
              <p className="text-gray-400 dark:text-white/30 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORÍAS ────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-blue-500 dark:text-blue-400/60 uppercase tracking-[0.2em] mb-3">
            Catálogo
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Todo lo que tu operación necesita
          </h2>
          <p className="text-gray-400 dark:text-white/30 mt-3 max-w-md mx-auto text-sm">
            Hardware de nivel enterprise disponible ahora. Sin tiempos de importación.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.id}
              to={cat.href}
              className={`group relative flex flex-col p-6 rounded-2xl border border-gray-100 dark:border-white/[0.07]
                          ${cat.border}
                          bg-white dark:bg-white/[0.03]
                          transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.hoverGrad} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}/>
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mb-5 ${cat.accent} group-hover:scale-110 transition-transform duration-300`}>
                  {cat.icon}
                </div>
                <p className="font-semibold text-gray-800 dark:text-white text-base mb-1.5">{cat.label}</p>
                <p className="text-gray-400 dark:text-white/35 text-xs leading-relaxed">{cat.desc}</p>
                <div className="mt-5 flex items-center gap-1 text-xs text-transparent group-hover:text-gray-400 dark:group-hover:text-white/50 transition-colors">
                  Explorar
                  <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── VALUE PROPS ───────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 dark:border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-blue-500 dark:text-blue-400/60 uppercase tracking-[0.2em] mb-3">
              Por qué Fast-IT
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Diferente desde el origen
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {VALUE_PROPS.map(vp => (
              <div
                key={vp.title}
                className="p-7 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.025] transition-all duration-300 hover:border-gray-200 dark:hover:border-white/[0.12] hover:shadow-md dark:hover:shadow-none"
              >
                <div className={`w-10 h-10 rounded-xl ${vp.bg} flex items-center justify-center mb-5 ${vp.color}`}>
                  {vp.icon}
                </div>
                <p className="font-semibold text-gray-800 dark:text-white text-base mb-2">{vp.title}</p>
                <p className="text-gray-500 dark:text-white/35 text-sm leading-relaxed">{vp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ASESOR CALLOUT ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="relative rounded-3xl overflow-hidden border border-blue-200 dark:border-blue-500/20 px-8 py-14 text-center bg-blue-50 dark:bg-[rgba(37,99,235,0.10)]">

          {/* Dark mode gradient overlay */}
          <div className="pointer-events-none absolute inset-0 hidden dark:block rounded-3xl"
               style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(29,78,216,0.10))' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px]"
                 style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.25) 0%, transparent 70%)' }}/>
          </div>

          <div className="relative">
            <p className="text-xs font-semibold text-blue-500 dark:text-blue-300/60 uppercase tracking-[0.2em] mb-4">
              Consultoría técnica gratuita
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-4">
              ¿No sabes qué hardware necesitas?
            </h2>
            <p className="text-gray-500 dark:text-white/40 text-base max-w-lg mx-auto mb-8">
              Nuestro asesor IA diagnostica tu carga de trabajo y te recomienda el equipo exacto en menos de 2 minutos.
            </p>
            <Link
              to={user ? '/advisor' : '/login'}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.97] shadow-lg shadow-blue-500/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Iniciar asesoría
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
