import { useState } from 'react'

// ─── Íconos SVG por tipo de componente ───────────────────────────────────────

const COMPONENT_ICONS = {
  cpu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>
    </svg>
  ),
  gpu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="10" rx="2"/>
      <circle cx="8"  cy="12" r="2"/>
      <circle cx="16" cy="12" r="2"/>
      <path d="M6 7V5M10 7V5M14 7V5M18 7V5"/>
    </svg>
  ),
  ram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="1"/>
      <path d="M6 6V4M10 6V4M14 6V4M18 6V4"/>
      <rect x="5" y="10" width="2" height="4" rx="0.5"/>
      <rect x="9" y="10" width="2" height="4" rx="0.5"/>
      <rect x="13" y="10" width="2" height="4" rx="0.5"/>
      <rect x="17" y="10" width="2" height="4" rx="0.5"/>
    </svg>
  ),
  ssd: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="M7 9h10M7 12h6"/>
      <circle cx="17" cy="15" r="1.5"/>
    </svg>
  ),
  hdd: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
      <circle cx="12" cy="12" r="1"/>
      <path d="M17 9h1"/>
    </svg>
  ),
  psu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  cooling: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  mobo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <rect x="6" y="6" width="5" height="5" rx="0.5"/>
      <rect x="13" y="6" width="5" height="3"/>
      <path d="M6 14h12M6 17h8M18 14v4"/>
    </svg>
  ),
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function WorkstationExplorer({ components }) {
  const [abierto,    setAbierto]    = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)

  if (!components?.length) return null

  const totalComponentes = components.reduce((s, c) => s + (c.price_usd || 0), 0)

  return (
    <div className="mt-6">
      {/* Botón trigger */}
      <button
        onClick={() => { setAbierto(v => !v); setSeleccionado(null) }}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl
                   border transition-all duration-300 group"
        style={{
          background:   abierto ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)',
          borderColor:  abierto ? 'rgba(96,165,250,0.4)'  : 'rgba(59,130,246,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">
              {abierto ? 'Ensamblar workstation' : 'Explorar componentes'}
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              {components.length} piezas · ${totalComponentes.toLocaleString('en-US')} USD en componentes
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-blue-400 transition-transform duration-500 ${abierto ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Grid de componentes */}
      <div
        className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxHeight: abierto ? '1200px' : '0px', opacity: abierto ? 1 : 0 }}
      >
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {components.map((comp, i) => (
            <ComponentCard
              key={comp.id}
              comp={comp}
              index={i}
              isOpen={abierto}
              isSelected={seleccionado === comp.id}
              onClick={() => setSeleccionado(s => s === comp.id ? null : comp.id)}
            />
          ))}
        </div>

        {/* Panel de detalle del componente seleccionado */}
        <div
          className="overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ maxHeight: seleccionado ? '500px' : '0px', opacity: seleccionado ? 1 : 0 }}
        >
          {seleccionado && (() => {
            const comp = components.find(c => c.id === seleccionado)
            if (!comp) return null
            return (
              <div className="mt-3 rounded-2xl border p-5 transition-all duration-300"
                   style={{ background: `${comp.color}10`, borderColor: `${comp.color}30` }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                       style={{ background: `${comp.color}20`, color: comp.color }}>
                    <div className="w-5 h-5">
                      {COMPONENT_ICONS[comp.id] || COMPONENT_ICONS.cpu}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                       style={{ color: comp.color }}>{comp.type}</p>
                    <h3 className="font-semibold text-white text-sm">{comp.name}</h3>
                    <p className="text-white/40 text-xs">{comp.brand}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-white/30">Valor estimado</p>
                    <p className="font-bold text-white">${comp.price_usd?.toLocaleString('en-US')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(comp.specs || {}).map(([k, v]) => (
                    <div key={k} className="rounded-xl px-3 py-2"
                         style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[10px] text-white/30 mb-0.5">{k}</p>
                      <p className="text-xs font-medium text-white/80">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ─── Card individual de componente ────────────────────────────────────────────

function ComponentCard({ comp, index, isOpen, isSelected, onClick }) {
  const icon = COMPONENT_ICONS[comp.id] || COMPONENT_ICONS.cpu

  return (
    <button
      onClick={onClick}
      className="relative text-left rounded-2xl border p-3.5 transition-all duration-300
                 hover:-translate-y-1 active:scale-[0.97] overflow-hidden"
      style={{
        background:   isSelected ? `${comp.color}18` : 'rgba(255,255,255,0.04)',
        borderColor:  isSelected ? `${comp.color}60` : 'rgba(255,255,255,0.08)',
        transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
        transform:    isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        opacity:      isOpen ? 1 : 0,
      }}
    >
      {/* Glow en fondo */}
      {isSelected && (
        <div className="absolute inset-0 opacity-10 rounded-2xl"
             style={{ background: `radial-gradient(circle at center, ${comp.color}, transparent 70%)` }}/>
      )}

      <div className="relative">
        {/* Ícono */}
        <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center"
             style={{ background: `${comp.color}18`, color: comp.color }}>
          <div className="w-4 h-4">{icon}</div>
        </div>

        {/* Tipo */}
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
           style={{ color: comp.color }}>
          {comp.type}
        </p>

        {/* Nombre */}
        <p className="text-xs font-semibold text-white/80 leading-snug line-clamp-2">
          {comp.name}
        </p>

        {/* Precio */}
        <p className="text-xs text-white/35 mt-2 font-mono">
          ${comp.price_usd?.toLocaleString('en-US')}
        </p>
      </div>
    </button>
  )
}
