import { Link } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { formatUSD } from '../../store/currencyStore'

const STOCK_LABELS = {
  available:    'Disponible',
  low_stock:    'Stock bajo',
  out_of_stock: 'Sin stock',
  on_request:   'Bajo pedido',
}

const CATEGORY_ICONS = {
  servers: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  storage: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16" />
    </svg>
  ),
  networking: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  accessories: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  workstations: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  ),
}

const CATEGORY_LABELS = {
  servers:      'Servidores',
  workstations: 'Workstation',
  storage:      'Storage',
  networking:   'Networking',
  accessories:  'Accesorios',
}

export default function ProductCard({ product }) {
  const addItem = useCartStore(s => s.addItem)
  const items   = useCartStore(s => s.items)
  const inCart  = items.some(i => i.id === product.id)
  const isOOS   = product.stock_status === 'out_of_stock'

  return (
    <div className="flex flex-col
                    bg-white dark:bg-[#0d1525]
                    border border-[#e2e8f0] dark:border-white/[0.07]
                    rounded-2xl overflow-hidden shadow-sm dark:shadow-none
                    hover:shadow-md dark:hover:shadow-none
                    hover:-translate-y-0.5
                    hover:border-[#cbd5e1] dark:hover:border-white/20
                    transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] group">

      {/* Top row: category + badge */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-[#64748b] dark:text-white/40">
          {CATEGORY_ICONS[product.category]}
          <span className="text-xs font-medium uppercase tracking-wider">
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
        </div>
        <span className={`badge-${product.stock_status}`}>
          {STOCK_LABELS[product.stock_status]}
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-[#e2e8f0] dark:border-white/[0.06]" />

      {/* Product info */}
      <div className="px-4 py-3 flex flex-col gap-0.5">
        <p className="text-[10px] font-mono text-[#94a3b8] dark:text-white/30 tracking-wider">{product.sku}</p>
        <h3 className="text-sm font-semibold text-[#0f172a] dark:text-white leading-snug line-clamp-2
                       group-hover:text-[#1e40af] dark:group-hover:text-blue-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-[#1e40af] dark:text-blue-400 font-medium mt-0.5">{product.brand}</p>
      </div>

      {/* Specs */}
      {product.technical_specs && (
        <div className="mx-4 border-t border-[#e2e8f0] dark:border-white/[0.06] pt-3 pb-3">
          <ul className="space-y-1.5">
            {Object.entries(product.technical_specs).slice(0, 3).map(([k, v]) => (
              <li key={k} className="flex items-baseline gap-2 text-xs">
                <span className="text-[#94a3b8] dark:text-white/30 shrink-0 w-20 truncate">{k}</span>
                <span className="text-[#0f172a] dark:text-white/80 font-medium truncate">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price + actions */}
      <div className="mt-auto mx-4 border-t border-[#e2e8f0] dark:border-white/[0.06] py-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] text-[#94a3b8] dark:text-white/30 uppercase tracking-wider mb-0.5">Precio neto</p>
          <span className="text-base font-semibold text-[#0f172a] dark:text-white">{formatUSD(product.public_price)}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            to={`/product/${product.sku}`}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Ver specs
          </Link>
          <button
            onClick={() => !isOOS && addItem(product)}
            disabled={isOOS}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-300 active:scale-[0.97] ${
              isOOS
                ? 'bg-[#f8fafc] dark:bg-white/[0.04] text-[#94a3b8] dark:text-white/25 cursor-not-allowed'
                : inCart
                  ? 'bg-[#eff6ff] dark:bg-blue-500/[0.15] text-[#1e40af] dark:text-blue-400 border border-[#bfdbfe] dark:border-blue-500/30'
                  : 'bg-[#1e40af] dark:bg-blue-500 text-white hover:bg-[#1d4ed8] dark:hover:bg-blue-400'
            }`}
          >
            {inCart ? 'En carrito' : 'Agregar'}
          </button>
        </div>
      </div>

    </div>
  )
}
