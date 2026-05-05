import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import SpecsTable        from '../components/product/SpecsTable'
import WorkstationExplorer from '../components/product/WorkstationExplorer'
import ScrollAssembly    from '../components/product/ScrollAssembly'
import { getProduct }    from '../api/client'
import { useCartStore }  from '../store/cartStore'
import Price             from '../components/ui/Price'

const STOCK_LABELS = {
  available:    'Disponible',
  low_stock:    'Stock bajo',
  out_of_stock: 'Sin stock',
  on_request:   'A pedido',
}

// Mapea SKU → carpeta de frames (en /public/frames/)
// Añadir aquí cada producto que tenga frames de scroll
// 720×1280 · 24fps · 8s · 192 frames
const SCROLL_FRAMES_MAP = {
  'DELL-PREC-7960-WS1': { frameCount: 192, ext: 'jpg', labelStart: 'Ensamblado.', labelEnd: 'Desarmado.' },
}

export default function ProductDetailPage() {
  const { sku }  = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const addItem   = useCartStore(s => s.addItem)
  const items     = useCartStore(s => s.items)
  const inCart    = product && items.some(i => i.id === product.id)

  useEffect(() => {
    setLoading(true)
    getProduct(sku)
      .then(setProduct)
      .catch(() => setError('Producto no encontrado.'))
      .finally(() => setLoading(false))
  }, [sku])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#6e6e73] dark:text-white/40 text-sm">
      Cargando…
    </div>
  )

  if (error || !product) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-[#6e6e73] dark:text-white/40 mb-4">{error || 'Producto no encontrado.'}</p>
      <Link to="/" className="btn-secondary">Volver al catálogo</Link>
    </div>
  )

  const scrollConfig = SCROLL_FRAMES_MAP[product.sku]

  return (
    <>
      {/* ── Sección superior: info + panel compra ──────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#6e6e73] dark:text-white/40 mb-6 flex gap-2 items-center">
          <Link to="/" className="hover:text-[#1e40af] dark:hover:text-blue-400 transition-colors">Catálogo</Link>
          <span>/</span>
          <span className="text-[#6e6e73] dark:text-white/40">{product.category}</span>
          <span>/</span>
          <span className="text-[#1d1d1f] dark:text-white font-medium">{product.sku}</span>
        </nav>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Info principal */}
          <div className="md:col-span-2 space-y-4">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-mono text-xs text-[#86868b] dark:text-white/35 mb-1">{product.sku}</p>
                  <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white leading-tight">{product.name}</h1>
                  <p className="text-[#1e40af] dark:text-blue-400 font-semibold text-sm mt-1">{product.brand}</p>
                </div>
                <span className={`badge-${product.stock_status} shrink-0`}>
                  {STOCK_LABELS[product.stock_status]}
                </span>
              </div>
              {product.description && (
                <p className="text-sm text-[#6e6e73] dark:text-white/40 border-t border-[#d2d2d7] dark:border-white/[0.07] pt-4 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Hint de scroll si hay frames */}
            {scrollConfig && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20
                              bg-blue-500/[0.06] text-blue-400 text-xs">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
                </svg>
                <span>Desplázate hacia abajo para desarmar este producto en sus componentes</span>
              </div>
            )}
          </div>

          {/* Panel de compra */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <div>
                <p className="text-xs text-[#6e6e73] dark:text-white/40 mb-1">Precio neto</p>
                <Price amount={product.public_price} className="text-3xl font-semibold text-[#1d1d1f] dark:text-white" />
                <p className="text-xs text-[#6e6e73] dark:text-white/40 mt-1">+ IVA según tipo de documento</p>
              </div>
              <hr className="border-[#d2d2d7] dark:border-white/[0.07]" />
              <button
                onClick={() => addItem(product)}
                disabled={product.stock_status === 'out_of_stock'}
                className={`btn-primary w-full py-2.5 ${inCart ? '!bg-[#005bb5]' : ''}`}
              >
                {inCart ? 'En carrito' : 'Agregar al carrito'}
              </button>
              {inCart && (
                <Link to="/checkout" className="btn-secondary w-full py-2 text-center block text-sm">
                  Ir al checkout
                </Link>
              )}
              <p className="text-xs text-[#6e6e73] dark:text-white/40 text-center">
                Despacho via cross-docking
              </p>
            </div>
            <div className="card p-4 space-y-2 text-xs text-[#6e6e73] dark:text-white/40">
              {['Garantía de fabricante incluida', 'Factura o boleta electrónica', 'Soporte técnico post-venta'].map(t => (
                <div key={t} className="flex gap-2 items-start">
                  <span className="text-[#1e40af] dark:text-blue-400 mt-0.5">•</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll animation full-bleed ────────────────────────────────────── */}
      {scrollConfig && (
        <ScrollAssembly
          framesPath={`/frames/${product.sku}`}
          frameCount={scrollConfig.frameCount}
          ext={scrollConfig.ext ?? 'webp'}
          labelStart={scrollConfig.labelStart}
          labelEnd={scrollConfig.labelEnd}
        />
      )}

      {/* ── Sección inferior: componentes + specs ──────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">

        {/* Explorador de componentes — workstations */}
        {product.components?.length > 0 && (
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(4,8,15,0.98))', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-6 pt-6 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
                <p className="text-xs font-semibold text-blue-400/70 uppercase tracking-widest">Arquitectura interna</p>
              </div>
              <h2 className="text-xl font-semibold text-white">Explorar componentes</h2>
              <p className="text-white/35 text-sm mt-1">Cada pieza que compone esta workstation</p>
            </div>
            <div className="px-6 pb-8">
              <WorkstationExplorer components={product.components} />
            </div>
          </div>
        )}

        {/* Especificaciones técnicas */}
        <div className="card overflow-hidden">
          <div className="bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-[#d2d2d7] dark:border-white/[0.07] px-4 py-3">
            <h2 className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-widest">
              Especificaciones Técnicas
            </h2>
          </div>
          <div className="p-4">
            <SpecsTable specs={product.technical_specs} />
          </div>
        </div>

      </div>
    </>
  )
}
