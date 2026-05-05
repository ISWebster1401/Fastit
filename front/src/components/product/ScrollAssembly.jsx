import { useEffect, useRef, useState, useCallback } from 'react'

const pad = (n, len = 4) => String(n).padStart(len, '0')

export default function ScrollAssembly({
  framesPath   = '/frames/workstation',
  frameCount   = 120,
  ext          = 'jpg',
  labelStart   = 'Ensamblado.',
  labelEnd     = 'Desarmado.',
  scrollHeight = '350vh',
}) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)
  const framesRef    = useRef([])
  const rafRef       = useRef(null)
  const lastIdx      = useRef(-1)

  const [loaded,   setLoaded]   = useState(0)
  const [progress, setProgress] = useState(0)

  // ── Dibuja con soporte retina ──────────────────────────────────────────────
  const drawFrame = useCallback((idx) => {
    if (idx === lastIdx.current) return
    lastIdx.current = idx
    const canvas = canvasRef.current
    if (!canvas) return
    const img = framesRef.current[idx]
    if (!img?.complete || !img.naturalWidth) return

    const dpr  = window.devicePixelRatio || 1
    const ctx  = canvas.getContext('2d')
    const cssW = canvas.clientWidth || img.naturalWidth
    const cssH = Math.round(cssW * img.naturalHeight / img.naturalWidth)

    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width        = cssW * dpr
      canvas.height       = cssH * dpr
      canvas.style.height = `${cssH}px`
      ctx.scale(dpr, dpr)
    }
    ctx.clearRect(0, 0, cssW, cssH)
    ctx.drawImage(img, 0, 0, cssW, cssH)
  }, [])

  // ── Precarga ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const images = []
    let count = 0
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image()
      img.src = `${framesPath}/frame_${pad(i)}.${ext}`
      img.onload = () => { count++; setLoaded(count); if (count === 1) drawFrame(0) }
      img.onerror = () => { count++; setLoaded(count) }
      images.push(img)
    }
    framesRef.current = images
  }, [framesPath, frameCount, ext]) // eslint-disable-line

  // ── Scroll ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const el = containerRef.current
        if (!el) return
        const rect  = el.getBoundingClientRect()
        const total = el.offsetHeight - window.innerHeight
        const pct   = Math.max(0, Math.min(1, -rect.top / total))
        setProgress(pct)
        drawFrame(Math.min(frameCount - 1, Math.floor(pct * frameCount)))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [frameCount, drawFrame])

  const isReady    = loaded === frameCount
  const loadPct    = Math.round((loaded / frameCount) * 100)
  const labelText  = progress < 0.5 ? labelStart : labelEnd
  const labelAlpha = Math.abs(progress - 0.5) * 2

  return (
    <div ref={containerRef} style={{ height: scrollHeight }} className="relative w-full">

      {/* Fondo adaptado al tema mediante clases Tailwind dark: */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden
                      bg-[#f5f9ff] dark:bg-[#04080f] transition-colors duration-300">

        {/* Loader */}
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10
                          bg-[#f5f9ff] dark:bg-[#04080f]">
            <div className="w-48 h-0.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
              <div className="h-full rounded-full transition-all duration-300 bg-black/30 dark:bg-white/35"
                   style={{ width: `${loadPct}%` }}/>
            </div>
            <p className="text-xs font-mono text-black/25 dark:text-white/20">{loadPct}%</p>
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="max-h-[85vh] w-auto transition-opacity duration-700"
          style={{ opacity: isReady ? 1 : 0 }}
        />

        {/* Label — color vía clases Tailwind, opacidad vía style */}
        {isReady && (
          <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none select-none">
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight
                          text-[#0f172a]/80 dark:text-white/85"
               style={{ opacity: labelAlpha }}>
              {labelText}
            </p>
          </div>
        )}

        {/* Scroll indicator */}
        {isReady && progress < 0.98 && (
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-px h-10 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
              <div className="w-full rounded-full bg-black/30 dark:bg-white/35 transition-all duration-100"
                   style={{ height: `${progress * 100}%` }}/>
            </div>
            {progress < 0.05 && (
              <svg className="w-4 h-4 animate-bounce text-black/20 dark:text-white/20"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7"/>
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
