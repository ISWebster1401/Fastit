import { useState } from 'react'
import { Link } from 'react-router-dom'
import { advisorNextQuestion } from '../api/client'
import { useCartStore, useAuthStore } from '../store/cartStore'

// ─── Casos de uso ─────────────────────────────────────────────────────────────

const CASOS = [
  {
    id: 'virtualizacion', category: 'servers',
    label: 'Virtualización', desc: 'VMware · Proxmox · Hyper-V',
    color: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>,
  },
  {
    id: 'base-datos', category: 'servers',
    label: 'Base de Datos', desc: 'SQL Server · Oracle · PostgreSQL',
    color: 'from-violet-500/20 to-violet-600/5',
    iconColor: 'text-violet-400',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1.343 3 3 3h10c1.657 0 3-1 3-3V7M4 7c0 2 1.343 3 3 3h10c1.657 0 3-1 3-3M4 7c0-2 1.343-3 3-3h10c1.657 0 3 1 3 3"/></svg>,
  },
  {
    id: 'storage', category: 'storage',
    label: 'Storage & Backup', desc: 'NAS · SAN · Archivado',
    color: 'from-cyan-500/20 to-cyan-600/5',
    iconColor: 'text-cyan-400',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16"/></svg>,
  },
  {
    id: 'ia-ml', category: 'servers',
    label: 'IA & Analítica', desc: 'GPU Clusters · ML Workloads',
    color: 'from-emerald-500/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  },
  {
    id: 'redes', category: 'networking',
    label: 'Redes & Seguridad', desc: 'Switching · Routing · WiFi',
    color: 'from-orange-500/20 to-orange-600/5',
    iconColor: 'text-orange-400',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>,
  },
  {
    id: 'experto', category: 'servers',
    label: 'Ya sé qué quiero', desc: 'Tengo un modelo o SKU en mente',
    color: 'from-rose-500/20 to-rose-600/5',
    iconColor: 'text-rose-400',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdvisorPage() {
  const [fase,                 setFase]                 = useState('inicio')
  const [caso,                 setCaso]                 = useState(null)
  const [historial,            setHistorial]            = useState([])
  const [actual,               setActual]               = useState(null)
  const [opcion,               setOpcion]               = useState(null)
  const [libre,                setLibre]                = useState('')
  const [rec,                  setRec]                  = useState(null)
  const [error,                setError]                = useState(null)
  const [slideKey,             setSlideKey]             = useState(0)
  const [dir,                  setDir]                  = useState('adelante')
  const [mostrarComoFunciona,  setMostrarComoFunciona]  = useState(false)

  const addItem   = useCartStore(s => s.addItem)
  const cartItems = useCartStore(s => s.items)
  const user      = useAuthStore(s => s.user)

  const formatUSD = (amount) =>
    `US$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const siguiente = async (casoActual, hist) => {
    setFase('cargando')
    setError(null)
    try {
      const res = await advisorNextQuestion(
        casoActual.category,
        hist.map(h => ({ question: h.pregunta, options: h.opciones, answer: h.respuesta }))
      )
      if (res.terminado) {
        setRec(res.recomendacion)
        setDir('adelante')
        setSlideKey(k => k + 1)
        setFase('listo')
      } else {
        setActual({ pregunta: res.pregunta, opciones: res.opciones })
        setOpcion(null)
        setLibre('')
        setDir('adelante')
        setSlideKey(k => k + 1)
        setFase('pregunta')
      }
    } catch (err) {
      setError(
        err.response?.status === 503
          ? 'El Asesor IA no está disponible. Agrega OPENAI_API_KEY en back/.env'
          : 'Error de conexión. Intenta de nuevo.'
      )
      setFase('pregunta')
    }
  }

  const iniciar = (c) => {
    setCaso(c)
    setHistorial([])
    setRec(null)
    setError(null)
    siguiente(c, [])
  }

  const continuar = () => {
    const respuesta = opcion || libre.trim()
    if (!respuesta) return
    const nuevaEntrada  = { pregunta: actual.pregunta, opciones: actual.opciones, respuesta }
    const nuevoHistorial = [...historial, nuevaEntrada]
    setHistorial(nuevoHistorial)
    siguiente(caso, nuevoHistorial)
  }

  const volver = () => {
    if (fase === 'listo') {
      const prev = historial[historial.length - 1]
      setHistorial(h => h.slice(0, -1))
      setActual({ pregunta: prev.pregunta, opciones: prev.opciones })
      const esOp = prev.opciones.includes(prev.respuesta)
      setOpcion(esOp ? prev.respuesta : null)
      setLibre(esOp ? '' : prev.respuesta)
      setRec(null)
      setDir('atras')
      setSlideKey(k => k + 1)
      setFase('pregunta')
      return
    }
    if (historial.length === 0) { setCaso(null); setFase('inicio'); return }
    const prev = historial[historial.length - 1]
    setHistorial(h => h.slice(0, -1))
    setActual({ pregunta: prev.pregunta, opciones: prev.opciones })
    const esOp = prev.opciones.includes(prev.respuesta)
    setOpcion(esOp ? prev.respuesta : null)
    setLibre(esOp ? '' : prev.respuesta)
    setDir('atras')
    setSlideKey(k => k + 1)
    setFase('pregunta')
  }

  const puedeAvanzar = opcion !== null || libre.trim().length > 0
  const todosEnCarrito = rec?.productos?.every(p => cartItems.some(i => i.id === p.id))

  const agregarTodo = () =>
    rec?.productos?.forEach(p => addItem({ ...p, id: p.id, public_price: p.price_clp }))

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#04080f] overflow-hidden flex flex-col">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)' }}/>
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)' }}/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.05) 0%, transparent 70%)' }}/>
      </div>

      {/* Header minimal */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-7 pb-2">
        <Link to="/"
          className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/>
          </svg>
          Fast-IT
        </Link>

        <div className="flex items-center gap-2 text-xs font-medium text-white/30 tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>
          Fast-IT · Consultor técnico
        </div>
      </header>

      {/* Contenido principal */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">

        {/* ════ INICIO ════ */}
        {fase === 'inicio' && (
          <div className="w-full max-w-3xl asesor-fade">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-blue-400/70 uppercase tracking-[0.2em] mb-4">
                Consultoría técnica · Fast-IT
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight mb-4 leading-tight">
                Tu solución<br/>
                <span className="text-blue-400">a medida</span>
              </h1>
              <p className="text-white/40 text-base max-w-sm mx-auto">
                Describenos el proyecto. Te recomendamos el hardware exacto para tu operación.
              </p>
            </div>

            {/* ¿Cómo funciona? */}
            <div className="mb-10 rounded-2xl border border-white/[0.07] overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              <button
                onClick={() => setMostrarComoFunciona(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left
                           hover:bg-white/[0.03] transition-colors"
              >
                <span className="flex items-center gap-2.5 text-white/70 font-medium text-sm">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  ¿Cómo funciona?
                </span>
                <svg
                  className={`w-4 h-4 text-white/30 transition-transform duration-300 ${mostrarComoFunciona ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {mostrarComoFunciona && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <div className="grid sm:grid-cols-3 gap-4 mt-4">
                    {[
                      {
                        n: '1',
                        titulo: 'Elige tu proyecto',
                        desc: 'Selecciona el tipo de infraestructura que necesitas: virtualización, bases de datos, storage, IA/ML o redes.',
                        color: 'text-blue-400',
                      },
                      {
                        n: '2',
                        titulo: 'Responde preguntas',
                        desc: 'Nuestro consultor técnico te hace preguntas precisas sobre carga de trabajo, escala y presupuesto.',
                        color: 'text-violet-400',
                      },
                      {
                        n: '3',
                        titulo: 'Recibe la solución',
                        desc: 'Obtienes una recomendación técnica justificada con los productos exactos del catálogo Fast-IT.',
                        color: 'text-emerald-400',
                      },
                    ].map(paso => (
                      <div key={paso.n} className="flex flex-col gap-2">
                        <div className={`w-7 h-7 rounded-full border ${paso.color} border-current flex items-center justify-center text-xs font-bold shrink-0`}>
                          {paso.n}
                        </div>
                        <p className="text-white/80 text-sm font-medium">{paso.titulo}</p>
                        <p className="text-white/35 text-xs leading-relaxed">{paso.desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-white/25 text-xs border-t border-white/[0.05] pt-4">
                    El proceso toma menos de 2 minutos. La recomendación considera siempre la relación costo-beneficio más honesta para tu proyecto.
                  </p>
                </div>
              )}
            </div>

            {/* Auth wall o grilla de casos */}
            {!user ? (
              <div className="flex flex-col items-center gap-4 py-10 rounded-2xl border border-white/[0.07]"
                   style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white/70 font-medium text-sm">Inicia sesión para comenzar</p>
                  <p className="text-white/30 text-xs mt-1 max-w-xs">
                    Necesitas una cuenta Fast-IT para recibir tu solución personalizada.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-full border border-white/[0.12] text-white/50 hover:text-white/80 hover:border-white/25 text-sm transition-colors"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CASOS.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => iniciar(c)}
                    className="asesor-card group relative text-left rounded-2xl p-5 border border-white/[0.07]
                               hover:border-white/20 transition-all duration-300 overflow-hidden
                               hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/30
                               active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.03)', animationDelay: `${i * 60}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}/>
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 ${c.iconColor} group-hover:scale-110 transition-transform`}>
                        {c.icon}
                      </div>
                      <p className="font-semibold text-white text-sm mb-1">{c.label}</p>
                      <p className="text-white/35 text-xs">{c.desc}</p>
                      <div className="mt-4 flex items-center gap-1 text-xs text-white/0 group-hover:text-white/50 transition-colors">
                        Iniciar
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ WIZARD ════ */}
        {fase !== 'inicio' && (
          <div className="w-full max-w-lg">

            {/* Barra superior del wizard */}
            <div className="flex items-center justify-between mb-10">
              <button
                onClick={volver}
                className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/>
                </svg>
                {historial.length === 0 && fase !== 'listo' ? 'Categorías' : 'Anterior'}
              </button>

              {/* Dots de progreso */}
              <div className="flex items-center gap-2">
                {historial.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
                ))}
                {(fase === 'pregunta' || fase === 'cargando') && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-pulse"/>
                )}
                {fase === 'listo' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                )}
              </div>

              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${caso?.iconColor}`}
                   style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="[&>svg]:w-3 [&>svg]:h-3">{caso?.icon}</span>
                <span className="text-white/50">{caso?.label}</span>
              </div>
            </div>

            {/* ── Cargando ── */}
            {fase === 'cargando' && (
              <div className="flex flex-col items-center gap-5 py-20 asesor-fade">
                <div className="flex gap-2">
                  {[0, 120, 240].map(d => (
                    <div key={d} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                         style={{ animationDelay: `${d}ms` }}/>
                  ))}
                </div>
                <p className="text-white/30 text-sm">Analizando tus respuestas…</p>
              </div>
            )}

            {/* ── Pregunta ── */}
            {fase === 'pregunta' && actual && (
              <div
                key={slideKey}
                className={dir === 'adelante' ? 'asesor-entra' : 'asesor-entra-atras'}
              >
                {/* Pregunta */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-white leading-snug mb-8">
                  {actual.pregunta}
                </h2>

                {/* Error */}
                {error && (
                  <div className="mb-5 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                {/* Opciones */}
                <div className="space-y-2.5 mb-3">
                  {actual.opciones.map((op, i) => (
                    <button
                      key={op}
                      onClick={() => { setOpcion(op); setLibre('') }}
                      className="asesor-card w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 group"
                      style={{
                        animationDelay: `${i * 55}ms`,
                        background: opcion === op
                          ? 'rgba(59,130,246,0.15)'
                          : 'rgba(255,255,255,0.04)',
                        borderColor: opcion === op
                          ? 'rgba(96,165,250,0.6)'
                          : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Radio */}
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                           style={{
                             borderColor: opcion === op ? '#60a5fa' : 'rgba(255,255,255,0.2)',
                             background:  opcion === op ? '#3b82f6' : 'transparent',
                           }}>
                        {opcion === op && <div className="w-2 h-2 rounded-full bg-white"/>}
                      </div>
                      <span className={`text-sm transition-colors ${opcion === op ? 'text-white font-medium' : 'text-white/65 group-hover:text-white/90'}`}>
                        {op}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Input libre */}
                <div className="asesor-card relative mb-8" style={{ animationDelay: `${actual.opciones.length * 55}ms` }}>
                  <input
                    value={libre}
                    onChange={e => { setLibre(e.target.value); setOpcion(null) }}
                    placeholder="Respuesta personalizada…"
                    className="w-full px-5 py-4 rounded-2xl border text-sm outline-none transition-all duration-200"
                    style={{
                      background: libre ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: libre ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)',
                      color: libre ? 'white' : undefined,
                      borderStyle: libre ? 'solid' : 'dashed',
                    }}
                  />
                  {libre && (
                    <button onClick={() => setLibre('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Botón continuar */}
                <button
                  onClick={continuar}
                  disabled={!puedeAvanzar}
                  className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: puedeAvanzar
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'rgba(255,255,255,0.06)',
                    color:  puedeAvanzar ? 'white' : 'rgba(255,255,255,0.25)',
                    boxShadow: puedeAvanzar ? '0 0 30px rgba(37,99,235,0.35)' : 'none',
                    cursor: puedeAvanzar ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continuar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            )}

            {/* ── Recomendación ── */}
            {fase === 'listo' && rec && (
              <div key={slideKey} className={`space-y-4 ${dir === 'adelante' ? 'asesor-entra' : 'asesor-entra-atras'}`}>

                {/* Banner */}
                <div className="rounded-2xl px-6 py-5 border border-blue-500/20"
                     style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(29,78,216,0.15))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-blue-300/70 text-xs font-medium uppercase tracking-wider">
                      Recomendación personalizada
                    </p>
                  </div>
                  <p className="text-white font-medium text-base leading-snug">{rec.resumen}</p>
                </div>

                {/* Sin stock */}
                {rec.productos?.length === 0 && (
                  <div className="rounded-2xl p-6 text-center border border-white/[0.06]"
                       style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white/40 text-sm">No hay productos disponibles para tu configuración.</p>
                    <p className="text-white/20 text-xs mt-1">Contáctanos para disponibilidad.</p>
                  </div>
                )}

                {/* Productos */}
                {rec.productos?.map((p, i) => (
                  <ProductoCard key={p.id} producto={p} i={i} addItem={addItem} cartItems={cartItems} formatPrice={formatUSD}/>
                ))}

                {/* Alternativa */}
                {rec.sobredimensionado && rec.productos_alternativos?.length > 0 && (
                  <div className="rounded-2xl p-4 border border-amber-500/20"
                       style={{ background: 'rgba(251,191,36,0.06)' }}>
                    <p className="text-amber-400/70 text-xs font-semibold uppercase tracking-wide mb-3">
                      Alternativa más económica
                    </p>
                    {rec.productos_alternativos.map((p, i) => (
                      <ProductoCard key={p.id} producto={p} i={i} addItem={addItem} cartItems={cartItems} formatPrice={formatUSD}/>
                    ))}
                  </div>
                )}

                {/* Justificación */}
                {rec.justificacion && (
                  <div className="rounded-2xl px-5 py-4 border border-white/[0.05]"
                       style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white/25 text-xs uppercase tracking-wider mb-2">Por qué esta recomendación</p>
                    <p className="text-white/55 text-sm leading-relaxed">{rec.justificacion}</p>
                  </div>
                )}

                {/* Agregar todo */}
                {rec.productos?.length > 0 && (
                  <button
                    onClick={agregarTodo}
                    disabled={todosEnCarrito}
                    className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{
                      background: todosEnCarrito
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: todosEnCarrito ? 'rgba(255,255,255,0.25)' : 'white',
                      boxShadow: todosEnCarrito ? 'none' : '0 0 30px rgba(37,99,235,0.35)',
                    }}
                  >
                    {todosEnCarrito ? '✓ Todo en el carrito' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                        </svg>
                        Agregar todo al carrito
                      </>
                    )}
                  </button>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setCaso(null); setFase('inicio'); setHistorial([]) }}
                    className="flex-1 py-3 rounded-2xl text-sm text-white/40 hover:text-white/70 border border-white/[0.07] hover:border-white/15 transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    Nueva consulta
                  </button>
                  <Link to="/checkout"
                    className="flex-1 py-3 rounded-2xl text-sm text-center font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                             border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Ver carrito →
                  </Link>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tarjeta de producto ──────────────────────────────────────────────────────

const STOCK_LABEL = { available: 'Disponible', low_stock: 'Stock bajo', on_request: 'Bajo pedido' }
const STOCK_DOT   = { available: 'bg-emerald-400', low_stock: 'bg-amber-400', on_request: 'bg-slate-400' }

function ProductoCard({ producto, i, addItem, cartItems, formatPrice }) {
  const enCarrito = cartItems.some(c => c.id === producto.id)
  return (
    <div
      className="asesor-card flex items-center justify-between gap-4 rounded-2xl px-5 py-4 border border-white/[0.07]"
      style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 80}ms` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="font-semibold text-white text-sm">{producto.name}</p>
          {STOCK_LABEL[producto.stock] && (
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <span className={`w-1.5 h-1.5 rounded-full ${STOCK_DOT[producto.stock] || 'bg-slate-400'}`}/>
              {STOCK_LABEL[producto.stock]}
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-white/25 mb-1">{producto.sku}</p>
        <p className="text-base font-bold text-blue-300">
          {formatPrice ? formatPrice(producto.price_clp) : `$${producto.price_clp?.toLocaleString('es-CL')}`}
        </p>
      </div>
      <button
        onClick={() => !enCarrito && addItem({ ...producto, id: producto.id, public_price: producto.price_clp })}
        disabled={enCarrito}
        className="shrink-0 text-xs px-4 py-2 rounded-xl font-medium transition-all active:scale-95"
        style={{
          background:  enCarrito ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.25)',
          color:       enCarrito ? 'rgba(255,255,255,0.25)' : '#93c5fd',
          border:      enCarrito ? '1px solid transparent' : '1px solid rgba(96,165,250,0.3)',
        }}
      >
        {enCarrito ? '✓' : '+ Agregar'}
      </button>
    </div>
  )
}
