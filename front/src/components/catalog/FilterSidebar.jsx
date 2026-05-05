const BRANDS     = ['HPE', 'Cisco', 'Dell', 'NetApp', 'Lenovo', 'Aruba']
const CATEGORIES = [
  { value: 'servers',       label: 'Servidores' },
  { value: 'workstations',  label: 'Workstations' },
  { value: 'storage',       label: 'Storage' },
  { value: 'networking',    label: 'Networking' },
  { value: 'accessories',   label: 'Accesorios' },
]

export default function FilterSidebar({ filters, onChange }) {
  const toggle = (key, value) => {
    onChange({ ...filters, [key]: filters[key] === value ? '' : value })
  }

  return (
    <aside className="w-full md:w-52 shrink-0">
      <div className="bg-white dark:bg-[#0d1525] border border-[#e2e8f0] dark:border-white/[0.07]
                      rounded-2xl p-4 space-y-5 sticky top-[88px] shadow-sm dark:shadow-none">

        {/* Categoría */}
        <div>
          <p className="text-[10px] font-semibold text-[#94a3b8] dark:text-white/30 uppercase tracking-widest mb-2.5">
            Categoría
          </p>
          <ul className="space-y-0.5">
            {CATEGORIES.map(c => (
              <li key={c.value}>
                <button
                  onClick={() => toggle('category', c.value)}
                  className={`relative w-full text-left text-sm px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
                    filters.category === c.value
                      ? 'text-[#1e40af] dark:text-blue-400 bg-[#eff6ff] dark:bg-blue-500/[0.15] pl-5 font-medium before:absolute before:left-2 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-[#1e40af] dark:before:bg-blue-400'
                      : 'text-[#64748b] dark:text-white/50 hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[#e2e8f0] dark:border-white/[0.06]" />

        {/* Marca */}
        <div>
          <p className="text-[10px] font-semibold text-[#94a3b8] dark:text-white/30 uppercase tracking-widest mb-2.5">
            Marca
          </p>
          <ul className="space-y-0.5">
            {BRANDS.map(b => (
              <li key={b}>
                <button
                  onClick={() => toggle('brand', b)}
                  className={`relative w-full text-left text-sm px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
                    filters.brand === b
                      ? 'text-[#1e40af] dark:text-blue-400 bg-[#eff6ff] dark:bg-blue-500/[0.15] pl-5 font-medium before:absolute before:left-2 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-[#1e40af] dark:before:bg-blue-400'
                      : 'text-[#64748b] dark:text-white/50 hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {b}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {(filters.brand || filters.category) && (
          <>
            <div className="border-t border-[#e2e8f0] dark:border-white/[0.06]" />
            <button
              onClick={() => onChange({ brand: '', category: '' })}
              className="text-xs text-[#64748b] dark:text-white/40 hover:text-[#1e40af] dark:hover:text-blue-400 transition-colors"
            >
              Limpiar filtros
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
