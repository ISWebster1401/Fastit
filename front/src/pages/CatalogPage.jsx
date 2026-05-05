import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FilterSidebar from '../components/catalog/FilterSidebar'
import ProductCard   from '../components/catalog/ProductCard'
import { getProducts } from '../api/client'
import { useAuthStore } from '../store/cartStore'

export default function CatalogPage() {
  const user            = useAuthStore(s => s.user)
  const [searchParams]  = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [filters,  setFilters]  = useState({
    brand: '',
    category: searchParams.get('cat') || '',
  })

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = {}
    if (filters.brand)    params.brand    = filters.brand
    if (filters.category) params.category = filters.category
    getProducts(params)
      .then(setProducts)
      .catch(() => setError('No se pudo cargar el catálogo. Verifica que el servidor esté activo.'))
      .finally(() => setLoading(false))
  }, [filters])

  return (
    <div>
      {/* Hero — solo para usuarios no autenticados */}
      {!user && (
        <div className="bg-gradient-to-b from-[#f5f9ff] to-white dark:from-[#04080f] dark:to-[#0a1120] border-b border-[#e2e8f0] dark:border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#1e40af] dark:text-blue-400 uppercase tracking-widest mb-3">
                Plataforma B2B exclusiva
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold text-[#0f172a] dark:text-white tracking-tight leading-tight mb-4">
                Hardware crítico para empresas
              </h1>
              <p className="text-[#64748b] dark:text-white/50 text-lg leading-relaxed mb-8">
                Servidores, storage y networking de las mejores marcas.
                Precios mayoristas, cross-docking y despacho express.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/login" className="btn-primary px-6 py-3 text-base">
                  Registra tu empresa
                </Link>
                <a href="#catalogo"
                  className="btn-secondary px-6 py-3 text-base"
                >
                  Ver catálogo
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
              {[
                { value: '+500', label: 'Productos' },
                { value: '24/48h', label: 'Despacho' },
                { value: '4', label: 'Marcas líderes' },
                { value: 'B2B', label: 'Factura disponible' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] rounded-2xl px-5 py-4 text-center shadow-sm dark:shadow-none">
                  <p className="text-2xl font-semibold text-[#0f172a] dark:text-white tracking-tight">{value}</p>
                  <p className="text-xs text-[#64748b] dark:text-white/40 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catálogo */}
      <div id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 pb-6 border-b border-[#e2e8f0] flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-[#0f172a] tracking-tight">
              {user ? 'Catálogo de Hardware' : 'Explorar catálogo'}
            </h2>
            <p className="text-[#64748b] text-sm mt-2">
              Storage | Servidores | Networking | Precios netos para empresas
            </p>
          </div>
          {!user && (
            <p className="text-xs text-[#64748b] hidden md:block max-w-xs text-right">
              Inicia sesión para agregar productos al carrito y realizar pedidos.
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <FilterSidebar filters={filters} onChange={setFilters} />

          <div className="flex-1">
            {loading && (
              <div className="flex items-center justify-center h-48">
                <div className="flex items-center gap-3 text-[#64748b] text-sm">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cargando productos…
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {!loading && !error && products.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-[#64748b] text-sm gap-3">
                <svg className="w-10 h-10 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                No se encontraron productos con los filtros seleccionados.
              </div>
            )}

            {!loading && !error && products.length > 0 && (
              <>
                <p className="text-xs text-[#64748b] mb-4">
                  {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
