import { useState, useEffect, useRef, Fragment } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  adminGetOrders, adminGetStats, adminUpdateStatus, adminGetTimeline,
  adminGetUsers, adminDeleteUser, adminToggleActive,
  adminGetProducts, adminDeleteProduct, adminImportPreview, adminImportConfirm,
} from '../api/client'

// ─── Constantes de estado ──────────────────────────────────────────────────────

const STATUS_FLOW = [
  'Pending', 'Supplier_Ordered', 'In_Transit_to_Nadilop',
  'Ready_to_Ship', 'Shipped', 'Delivered',
]

const STATUS_META = {
  Pending:               { label: 'Pendiente',           color: 'bg-amber-50   text-amber-700   border-amber-200   dark:bg-amber-500/20  dark:text-amber-300  dark:border-amber-500/30',   dot: 'bg-amber-400',   chart: '#f59e0b' },
  Supplier_Ordered:      { label: 'Pedido al proveedor', color: 'bg-blue-50    text-blue-700    border-blue-200    dark:bg-blue-500/20   dark:text-blue-300   dark:border-blue-500/30',    dot: 'bg-blue-400',    chart: '#3b82f6' },
  In_Transit_to_Nadilop: { label: 'En tránsito',         color: 'bg-violet-50  text-violet-700  border-violet-200  dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',  dot: 'bg-violet-400',  chart: '#8b5cf6' },
  Ready_to_Ship:         { label: 'Listo para envío',    color: 'bg-purple-50  text-purple-700  border-purple-200  dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',  dot: 'bg-purple-400',  chart: '#a855f7' },
  Shipped:               { label: 'Enviado',             color: 'bg-orange-50  text-orange-700  border-orange-200  dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',  dot: 'bg-orange-400',  chart: '#f97316' },
  Delivered:             { label: 'Entregado',           color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30', dot: 'bg-emerald-400', chart: '#10b981' },
}

const NEXT = {
  Pending: 'Supplier_Ordered', Supplier_Ordered: 'In_Transit_to_Nadilop',
  In_Transit_to_Nadilop: 'Ready_to_Ship', Ready_to_Ship: 'Shipped',
  Shipped: 'Delivered', Delivered: null,
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function AdminPage() {
  const [orders,       setOrders]       = useState([])
  const [stats,        setStats]        = useState(null)
  const [timeline,     setTimeline]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId,   setExpandedId]   = useState(null)
  const [updating,     setUpdating]     = useState(null)
  const [timelineDays, setTimelineDays] = useState(30)
  const [tab,            setTab]            = useState('dashboard')
  const [users,          setUsers]          = useState([])
  const [usersLoading,   setUsersLoading]   = useState(false)
  const [products,       setProducts]       = useState([])
  const [productsLoading,setProductsLoading]= useState(false)
  const [showImport,     setShowImport]     = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([adminGetOrders(), adminGetStats(), adminGetTimeline(timelineDays)])
      .then(([o, s, t]) => { setOrders(o); setStats(s); setTimeline(t) })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  useEffect(() => {
    if (!loading) adminGetTimeline(timelineDays).then(setTimeline).catch(() => {})
  }, [timelineDays]) // eslint-disable-line

  useEffect(() => {
    if (tab === 'users' && users.length === 0) {
      setUsersLoading(true)
      adminGetUsers().then(setUsers).catch(() => {}).finally(() => setUsersLoading(false))
    }
    if (tab === 'products' && products.length === 0) {
      setProductsLoading(true)
      adminGetProducts().then(setProducts).catch(() => {}).finally(() => setProductsLoading(false))
    }
  }, [tab]) // eslint-disable-line

  const refreshProducts = () => {
    setProductsLoading(true)
    adminGetProducts().then(setProducts).catch(() => {}).finally(() => setProductsLoading(false))
  }

  const handleDeleteProduct = async (productId, sku) => {
    if (!window.confirm(`¿Eliminar el producto ${sku}?`)) return
    try {
      await adminDeleteProduct(productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar el producto.')
    }
  }

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`¿Eliminar al usuario ${email}? Esta acción también eliminará sus órdenes.`)) return
    await adminDeleteUser(userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  const handleToggleActive = async (userId) => {
    const data = await adminToggleActive(userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: data.is_active } : u))
  }

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(orderId)
    try {
      const updated = await adminUpdateStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      adminGetStats().then(setStats).catch(() => {})
    } catch {
      alert('Error al actualizar el estado.')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const q = search.toLowerCase().trim()
    const matchSearch = !q || String(o.id).includes(q)
      || o.client_name?.toLowerCase().includes(q)
      || o.client_email?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // Datos para el pie chart
  const pieData = stats
    ? STATUS_FLOW.filter(s => (stats.by_status[s] || 0) > 0).map(s => ({
        name:  STATUS_META[s]?.label,
        value: stats.by_status[s] || 0,
        color: STATUS_META[s]?.chart,
      }))
    : []

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-[#6e6e73] dark:text-white/40 text-sm">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Cargando panel…
      </div>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-600 text-sm">{error}</div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between border-b border-[#d2d2d7] dark:border-white/[0.07] pb-5">
        <div>
          <p className="text-xs font-semibold text-[#1e40af] dark:text-blue-400 uppercase tracking-widest mb-1">
            Fast-IT
          </p>
          <h1 className="text-3xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
            Panel de Administración
          </h1>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-white/40
                     hover:text-[#1e40af] dark:hover:text-blue-400
                     border border-[#e2e8f0] dark:border-white/[0.08] rounded-full px-3 py-1.5
                     hover:border-[#1e40af] dark:hover:border-blue-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total órdenes"  value={stats.total_orders}     icon={<ClipboardIcon/>}  color="text-[#1e40af] dark:text-blue-300"     bg="bg-[#e8f2ff] dark:bg-blue-500/20"     />
          <StatCard label="Pendientes"     value={stats.pending_count}    icon={<ClockIcon/>}       color="text-amber-600 dark:text-amber-300"    bg="bg-amber-50 dark:bg-amber-500/20"     />
          <StatCard label="Revenue (USD)"  value={`$${Math.round(stats.total_revenue).toLocaleString('en-US')}`} icon={<CurrencyIcon/>} color="text-emerald-600 dark:text-emerald-300" bg="bg-emerald-50 dark:bg-emerald-500/20" />
          <StatCard label="Entregadas"     value={stats.delivered_count}  icon={<CheckCircleIcon/>} color="text-violet-600 dark:text-violet-300"   bg="bg-violet-50 dark:bg-violet-500/20"   />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#e2e8f0] dark:border-white/[0.07]">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'orders',    label: `Órdenes (${orders.length})` },
          { id: 'users',     label: `Usuarios (${stats?.total_users ?? '…'})` },
          { id: 'products',  label: `Productos (${products.length || '…'})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-[#1e40af] text-[#1e40af] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[#6e6e73] dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Revenue + órdenes en el tiempo */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1d1d1f] dark:text-white text-sm">
                Revenue y órdenes — últimos {timelineDays} días
              </h2>
              <div className="flex gap-1">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setTimelineDays(d)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                      timelineDays === d
                        ? 'bg-[#1e40af] dark:bg-blue-500 text-white'
                        : 'text-[#6e6e73] dark:text-white/40 hover:bg-[#f1f5f9] dark:hover:bg-white/[0.06]'
                    }`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {timeline ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={timeline.timeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)"/>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v => v.slice(5)} interval="preserveStartEnd"/>
                  <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v => `$${v}`} width={50}/>
                  <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} width={30}/>
                  <Tooltip
                    contentStyle={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value, name) => [
                      name === 'Revenue' ? `$${value.toLocaleString('en-US')} USD` : value,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }}/>
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue"
                    stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2}/>
                  <Area yAxisId="ord" type="monotone" dataKey="orders"  name="Órdenes"
                    stroke="#10b981" fill="url(#ordGrad)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-[#94a3b8] text-sm">
                Sin datos aún
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie por estado */}
            <div className="card p-5">
              <h2 className="font-semibold text-[#1d1d1f] dark:text-white text-sm mb-4">
                Distribución por estado
              </h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color}/>
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                      formatter={(value, name) => [value, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-[#94a3b8] text-sm">
                  Sin órdenes aún
                </div>
              )}
            </div>

            {/* Barras por estado */}
            <div className="card p-5">
              <h2 className="font-semibold text-[#1d1d1f] dark:text-white text-sm mb-4">
                Órdenes por estado
              </h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pieData} margin={{ top: 5, right: 5, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)"/>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end"/>
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }}/>
                    <Tooltip
                      contentStyle={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                    />
                    <Bar dataKey="value" name="Órdenes" radius={[4, 4, 0, 0]}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-[#94a3b8] text-sm">
                  Sin órdenes aún
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ÓRDENES ── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b] dark:text-white/30 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por #orden o cliente…" className="input-field pl-9 text-sm"/>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                Todas ({orders.length})
              </FilterChip>
              {STATUS_FLOW.map(s => {
                const count = orders.filter(o => o.status === s).length
                if (count === 0) return null
                return (
                  <FilterChip key={s} active={statusFilter === s}
                    onClick={() => setStatusFilter(s)} dot={STATUS_META[s]?.dot}>
                    {STATUS_META[s]?.label} ({count})
                  </FilterChip>
                )
              })}
            </div>
          </div>

          {/* Tabla */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[#6e6e73] dark:text-white/40 text-sm">
              No se encontraron órdenes.
            </div>
          ) : (
            <div className="border border-[#d2d2d7] dark:border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-[#d2d2d7] dark:border-white/[0.07]
                                   text-[#6e6e73] dark:text-white/40 text-xs font-semibold uppercase tracking-wider">
                      <th className="text-left px-4 py-3">#</th>
                      <th className="text-left px-4 py-3">Cliente</th>
                      <th className="text-left px-4 py-3">Estado</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Documento</th>
                      <th className="text-center px-4 py-3 hidden lg:table-cell">Items</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">Fecha</th>
                      <th className="px-4 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d2d2d7] dark:divide-white/[0.06]">
                    {filtered.map(order => (
                      <Fragment key={order.id}>
                        <tr onClick={() => setExpandedId(p => p === order.id ? null : order.id)}
                          className={`cursor-pointer transition-colors ${
                            expandedId === order.id
                              ? 'bg-[#f0f7ff] dark:bg-blue-500/[0.08]'
                              : 'hover:bg-[#f5f5f7] dark:hover:bg-white/[0.03]'
                          }`}>
                          <td className="px-4 py-3 font-mono text-xs text-[#86868b] dark:text-white/35 font-semibold">
                            #{String(order.id).padStart(4, '0')}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#1d1d1f] dark:text-white truncate max-w-[160px]">
                              {order.client_name || `Usuario #${order.user_id}`}
                            </p>
                            {order.client_email && order.client_name !== order.client_email && (
                              <p className="text-xs text-[#86868b] dark:text-white/35 truncate max-w-[160px]">
                                {order.client_email}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={order.status}/></td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              order.document_type === 'Factura'
                                ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30'
                                : 'bg-[#f5f5f7] text-[#6e6e73] border-[#d2d2d7] dark:bg-white/[0.05] dark:text-white/40 dark:border-white/[0.08]'
                            }`}>
                              {order.document_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell text-[#6e6e73] dark:text-white/40">
                            {order.items.length}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#1d1d1f] dark:text-white">
                            ${Number(order.total_amount).toLocaleString('en-US')}
                          </td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell text-xs text-[#86868b] dark:text-white/35">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <svg className={`w-4 h-4 text-[#86868b] dark:text-white/30 transition-transform duration-200 ${expandedId === order.id ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg>
                          </td>
                        </tr>

                        {expandedId === order.id && (
                          <tr>
                            <td colSpan={8} className="bg-[#f9f9fb] dark:bg-white/[0.02] border-t border-[#e8e8ed] dark:border-white/[0.06]">
                              <OrderDetail order={order} onUpdate={handleStatusChange} isUpdating={updating === order.id}/>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── TAB: PRODUCTOS ── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6e6e73] dark:text-white/40">
              {products.length} producto{products.length !== 1 ? 's' : ''} en el catálogo
            </p>
            <div className="flex gap-2">
              <button onClick={refreshProducts}
                className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-white/40
                           hover:text-[#1e40af] dark:hover:text-blue-400
                           border border-[#e2e8f0] dark:border-white/[0.08] rounded-full px-3 py-1.5
                           hover:border-[#1e40af] dark:hover:border-blue-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Actualizar
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 text-xs font-medium
                           bg-[#1e40af] hover:bg-[#1d4ed8] text-white
                           rounded-full px-4 py-1.5 transition-colors active:scale-[0.97]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Agregar desde Icecat
              </button>
            </div>
          </div>

          {productsLoading ? (
            <div className="text-center py-16 text-[#6e6e73] dark:text-white/40 text-sm">Cargando productos…</div>
          ) : (
            <div className="border border-[#d2d2d7] dark:border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-[#d2d2d7] dark:border-white/[0.07]
                                   text-[#6e6e73] dark:text-white/40 text-xs font-semibold uppercase tracking-wider">
                      <th className="text-left px-4 py-3">SKU</th>
                      <th className="text-left px-4 py-3">Producto</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Categoría</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Origen</th>
                      <th className="text-center px-4 py-3">Stock</th>
                      <th className="text-right px-4 py-3">Precio</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d2d2d7] dark:divide-white/[0.06]">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-[#f5f5f7] dark:hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 font-mono text-[10px] text-[#86868b] dark:text-white/35 font-semibold">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1d1d1f] dark:text-white text-xs truncate max-w-[200px]">{p.name}</p>
                          <p className="text-[10px] text-[#86868b] dark:text-white/35">{p.brand}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-[#6e6e73] dark:text-white/40 capitalize">{p.category}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            p.source === 'icecat'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                              : 'bg-[#f5f5f7] text-[#6e6e73] border-[#d2d2d7] dark:bg-white/[0.05] dark:text-white/40 dark:border-white/[0.08]'
                          }`}>
                            {p.source === 'icecat' ? '⬡ Icecat' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.stock_status === 'available'  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                            p.stock_status === 'low_stock'  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                            p.stock_status === 'on_request' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' :
                                                              'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                          }`}>
                            {{ available:'Disponible', low_stock:'Stock bajo', on_request:'Bajo pedido', out_of_stock:'Sin stock' }[p.stock_status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1d1d1f] dark:text-white text-xs">
                          US${Number(p.public_price).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.sku)}
                            className="p-1.5 rounded-lg text-[#64748b] dark:text-white/40
                                       hover:bg-red-50 dark:hover:bg-red-500/10
                                       hover:text-red-600 dark:hover:text-red-400 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: USUARIOS ── */}
      {tab === 'users' && (
        <div>
          {usersLoading ? (
            <div className="text-center py-16 text-[#6e6e73] dark:text-white/40 text-sm">Cargando usuarios…</div>
          ) : (
            <div className="border border-[#d2d2d7] dark:border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-[#d2d2d7] dark:border-white/[0.07]
                                   text-[#6e6e73] dark:text-white/40 text-xs font-semibold uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Usuario</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Tipo</th>
                      <th className="text-center px-4 py-3">Email</th>
                      <th className="text-center px-4 py-3 hidden lg:table-cell">Órdenes</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">Gastado</th>
                      <th className="text-center px-4 py-3">Estado</th>
                      <th className="px-4 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d2d2d7] dark:divide-white/[0.06]">
                    {users.map(u => (
                      <tr key={u.id} className={`transition-colors ${!u.is_active ? 'opacity-50' : 'hover:bg-[#f5f5f7] dark:hover:bg-white/[0.03]'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${u.is_admin ? 'bg-violet-500' : 'bg-[#1e40af]'}`}>
                              {u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[#1d1d1f] dark:text-white text-xs truncate max-w-[180px]">
                                {u.business_name || u.email}
                              </p>
                              {u.business_name && (
                                <p className="text-[10px] text-[#86868b] dark:text-white/35 truncate max-w-[180px]">{u.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            u.is_admin
                              ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30'
                              : u.is_company
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                                : 'bg-[#f5f5f7] text-[#6e6e73] border-[#d2d2d7] dark:bg-white/[0.05] dark:text-white/40 dark:border-white/[0.08]'
                          }`}>
                            {u.is_admin ? 'Admin' : u.is_company ? 'Empresa' : 'Personal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.email_verified ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                              Verificado
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400">Pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-[#6e6e73] dark:text-white/40 hidden lg:table-cell">
                          {u.total_orders}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1d1d1f] dark:text-white text-xs hidden lg:table-cell">
                          ${u.total_spent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                          }`}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {!u.is_admin && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleActive(u.id)}
                                title={u.is_active ? 'Desactivar' : 'Activar'}
                                className="p-1.5 rounded-lg text-[#64748b] dark:text-white/40
                                           hover:bg-[#f1f5f9] dark:hover:bg-white/[0.06]
                                           hover:text-[#1e40af] dark:hover:text-blue-400 transition-all"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d={u.is_active
                                      ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                      : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                title="Eliminar usuario"
                                className="p-1.5 rounded-lg text-[#64748b] dark:text-white/40
                                           hover:bg-red-50 dark:hover:bg-red-500/10
                                           hover:text-red-600 dark:hover:text-red-400 transition-all"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: IMPORTAR DESDE ICECAT ── */}
      {showImport && (
        <IcecatImportModal
          onClose={() => setShowImport(false)}
          onCreated={(product) => {
            setShowImport(false)
            setProducts(prev => [product, ...prev])
          }}
        />
      )}

    </div>
  )
}

// ─── IcecatImportModal ────────────────────────────────────────────────────────

const STOCK_OPTIONS = [
  { value: 'available',    label: 'Disponible' },
  { value: 'low_stock',    label: 'Stock bajo' },
  { value: 'on_request',   label: 'Bajo pedido' },
  { value: 'out_of_stock', label: 'Sin stock' },
]

const CATEGORY_OPTIONS = [
  'servers', 'storage', 'networking', 'workstations', 'accessories',
]

function IcecatImportModal({ onClose, onCreated }) {
  const [step,        setStep]        = useState('input')   // input | loading | preview | saving | done
  const [url,         setUrl]         = useState('')
  const [imageFile,   setImageFile]   = useState(null)
  const [removeBg,    setRemoveBg]    = useState(false)
  const [preview,     setPreview]     = useState(null)
  const [apiError,    setApiError]    = useState(null)
  const [dupError,    setDupError]    = useState(null)
  const imageInputRef                 = useRef(null)

  // Editable preview fields
  const [form, setForm] = useState({})
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setSpec = (key, val) => setForm(f => ({
    ...f,
    technical_specs: { ...f.technical_specs, [key]: val },
  }))
  const removeSpec = (key) => setForm(f => {
    const s = { ...f.technical_specs }
    delete s[key]
    return { ...f, technical_specs: s }
  })

  const handleFetch = async () => {
    if (!url.trim()) return
    setStep('loading')
    setApiError(null)
    setDupError(null)
    try {
      const fd = new FormData()
      fd.append('icecat_url', url.trim())
      fd.append('remove_bg',  removeBg ? 'true' : 'false')
      if (imageFile) fd.append('image_file', imageFile)
      const data = await adminImportPreview(fd)
      setPreview(data)
      setForm({
        sku:             data.sku,
        name:            data.name,
        brand:           data.brand,
        category:        data.category,
        description:     data.description,
        technical_specs: data.technical_specs || {},
        image_url:       data.image_url || '',
        base_price:      data.base_price || '',
        stock_status:    data.stock_status || 'on_request',
      })
      setStep('preview')
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Error al conectar con Icecat.')
      setStep('input')
    }
  }

  const handleConfirm = async (updateExisting = false) => {
    setStep('saving')
    setDupError(null)
    try {
      const result = await adminImportConfirm({
        icecat_product_id:  preview.icecat_product_id,
        source_url:         preview.source_url,
        sku:                form.sku,
        name:               form.name,
        brand:              form.brand,
        category:           form.category,
        description:        form.description || '',
        technical_specs:    form.technical_specs,
        image_url:          form.image_url || null,
        base_price:         parseFloat(form.base_price),
        stock_status:       form.stock_status,
        raw_source_payload: preview.raw_source_payload,
        update_existing:    updateExisting,
      })
      onCreated(result)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 409 && typeof detail === 'object') {
        setDupError(detail)
        setStep('preview')
      } else {
        setApiError(typeof detail === 'string' ? detail : 'Error al guardar el producto.')
        setStep('preview')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white dark:bg-[#0d1525] border border-[#e2e8f0] dark:border-white/[0.1]
                      rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] dark:border-white/[0.07]">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">
              Icecat Import
            </p>
            <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
              Agregar producto desde Icecat
            </h2>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-full text-[#64748b] dark:text-white/40
                       hover:bg-[#f1f5f9] dark:hover:bg-white/[0.06] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── STEP: INPUT ── */}
          {(step === 'input' || step === 'loading') && (
            <>
              {/* URL */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                  URL de Icecat <span className="text-red-500">*</span>
                </label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://icecat.biz/p/brand-model-12345.html  o  ID numérico"
                  className="input-field text-sm w-full"
                  disabled={step === 'loading'}
                  onKeyDown={e => e.key === 'Enter' && handleFetch()}
                />
                <p className="text-[10px] text-[#94a3b8] mt-1">
                  Pega la URL de la página del producto en icecat.biz o icecat.us, o el ID numérico.
                </p>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                  Imagen personalizada (opcional)
                </label>
                <div
                  className="border-2 border-dashed border-[#e2e8f0] dark:border-white/[0.12] rounded-xl p-4
                             text-center cursor-pointer hover:border-[#1e40af] dark:hover:border-blue-400 transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {imageFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-[#1d1d1f] dark:text-white">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                      {imageFile.name}
                      <button onClick={e => { e.stopPropagation(); setImageFile(null) }}
                        className="text-[#94a3b8] hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <svg className="w-8 h-8 mx-auto text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <p className="text-xs text-[#94a3b8]">Click para subir imagen (PNG, JPG, WebP)</p>
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setImageFile(e.target.files?.[0] ?? null)}/>
              </div>

              {/* Remove BG */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setRemoveBg(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${removeBg ? 'bg-blue-600' : 'bg-[#d1d5db] dark:bg-white/20'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${removeBg ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                </div>
                <span className="text-sm text-[#1d1d1f] dark:text-white">
                  Quitar fondo automáticamente
                </span>
                <span className="text-[10px] text-[#94a3b8] bg-[#f1f5f9] dark:bg-white/[0.06] px-1.5 py-0.5 rounded">TODO</span>
              </label>

              {apiError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10
                                border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
                  {apiError}
                </div>
              )}

              <button
                onClick={handleFetch}
                disabled={!url.trim() || step === 'loading'}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                           bg-[#1e40af] hover:bg-[#1d4ed8] text-white transition-all disabled:opacity-50
                           disabled:cursor-not-allowed active:scale-[0.98]">
                {step === 'loading' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Consultando Icecat…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    Traer datos
                  </>
                )}
              </button>
            </>
          )}

          {/* ── STEP: PREVIEW (editable) ── */}
          {(step === 'preview' || step === 'saving') && form && (
            <>
              <div className="flex items-center gap-2 text-xs text-[#94a3b8] bg-[#f8fafc] dark:bg-white/[0.04]
                              border border-[#e2e8f0] dark:border-white/[0.07] rounded-xl px-3 py-2">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                Icecat ID: <strong className="text-[#1d1d1f] dark:text-white">{preview?.icecat_product_id}</strong>
                <span className="mx-1">·</span>
                Revisa y edita los campos antes de guardar. El precio base es requerido.
              </div>

              {/* Dup error */}
              {dupError && (
                <div className="text-xs bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20
                                rounded-xl px-4 py-3 space-y-2">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">{dupError.message}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors">
                      Actualizar producto existente (ID #{dupError.existing_id})
                    </button>
                    <button onClick={() => setDupError(null)}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs transition-colors">
                      Cambiar SKU
                    </button>
                  </div>
                </div>
              )}

              {apiError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10
                                border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
                  {apiError}
                </div>
              )}

              {/* Image preview */}
              {form.image_url && (
                <div className="flex items-center gap-4">
                  <img src={form.image_url} alt={form.name}
                    className="w-20 h-20 object-contain rounded-xl border border-[#e2e8f0] dark:border-white/[0.1] bg-[#f8fafc] dark:bg-white/[0.04]"/>
                  <div className="flex-1">
                    <p className="text-xs text-[#94a3b8] mb-1">URL de imagen</p>
                    <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
                      className="input-field text-xs w-full" placeholder="https://..."/>
                  </div>
                </div>
              )}

              {/* Core fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">SKU <span className="text-red-500">*</span></label>
                  <input value={form.sku} onChange={e => set('sku', e.target.value)}
                    className="input-field text-sm w-full font-mono" placeholder="BRAND-MODEL-001"/>
                </div>
                <div>
                  <label className="field-label">Marca <span className="text-red-500">*</span></label>
                  <input value={form.brand} onChange={e => set('brand', e.target.value)}
                    className="input-field text-sm w-full"/>
                </div>
                <div className="col-span-2">
                  <label className="field-label">Nombre <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    className="input-field text-sm w-full"/>
                </div>
                <div>
                  <label className="field-label">Categoría</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="input-field text-sm w-full">
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Stock</label>
                  <select value={form.stock_status} onChange={e => set('stock_status', e.target.value)}
                    className="input-field text-sm w-full">
                    {STOCK_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="field-label">
                    Precio base USD (mayorista) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.base_price}
                    onChange={e => set('base_price', e.target.value)}
                    className="input-field text-sm w-full"
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-[#94a3b8] mt-1">
                    El precio público se calcula automáticamente con el margen de la categoría.
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="field-label">Descripción</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} className="input-field text-sm w-full resize-none"/>
              </div>

              {/* Specs editable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="field-label mb-0">Especificaciones técnicas</label>
                  <button
                    onClick={() => {
                      const key = `Spec ${Object.keys(form.technical_specs).length + 1}`
                      setSpec(key, '')
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                    + Añadir
                  </button>
                </div>
                <div className="border border-[#e2e8f0] dark:border-white/[0.08] rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#e2e8f0] dark:divide-white/[0.06]">
                    {Object.entries(form.technical_specs || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 px-3 py-1.5">
                        <input
                          defaultValue={k}
                          onBlur={e => {
                            const newKey = e.target.value.trim()
                            if (!newKey || newKey === k) return
                            setForm(f => {
                              const s = { ...f.technical_specs }
                              const val = s[k]
                              delete s[k]
                              s[newKey] = val
                              return { ...f, technical_specs: s }
                            })
                          }}
                          className="w-36 text-xs border-0 bg-transparent text-[#6e6e73] dark:text-white/50
                                     focus:outline-none focus:text-[#1d1d1f] dark:focus:text-white"
                        />
                        <span className="text-[#d1d5db] dark:text-white/20">·</span>
                        <input value={v} onChange={e => setSpec(k, e.target.value)}
                          className="flex-1 text-xs border-0 bg-transparent text-[#1d1d1f] dark:text-white
                                     focus:outline-none"/>
                        <button onClick={() => removeSpec(k)}
                          className="text-[#94a3b8] hover:text-red-500 transition-colors shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    {Object.keys(form.technical_specs || {}).length === 0 && (
                      <p className="px-3 py-3 text-xs text-[#94a3b8]">Sin especificaciones.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep('input'); setDupError(null); setApiError(null) }}
                  className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] dark:border-white/[0.1]
                             text-sm text-[#6e6e73] dark:text-white/50
                             hover:border-[#94a3b8] dark:hover:border-white/25 transition-all">
                  ← Volver
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  disabled={
                    !form.sku || !form.name || !form.brand ||
                    !form.base_price || Number(form.base_price) <= 0 ||
                    step === 'saving'
                  }
                  className="flex-2 flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                             bg-[#1e40af] hover:bg-[#1d4ed8] text-white transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                  {step === 'saving' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Guardando…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                      Guardar producto
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── OrderDetail ──────────────────────────────────────────────────────────────

function OrderDetail({ order, onUpdate, isUpdating }) {
  const [selectedStatus, setSelectedStatus] = useState(order.status)
  const nextStatus = NEXT[order.status]
  const currentIdx = STATUS_FLOW.indexOf(order.status)

  return (
    <div className="px-4 py-5 space-y-6">
      <div>
        <p className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-wider mb-4">Estado del pedido</p>
        <div className="flex items-start gap-0">
          {STATUS_FLOW.map((s, idx) => {
            const isCompleted = idx < currentIdx
            const isCurrent   = idx === currentIdx
            const isLast      = idx === STATUS_FLOW.length - 1
            const meta        = STATUS_META[s]
            return (
              <div key={s} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted ? 'bg-[#1e40af] border-[#1e40af]'
                    : isCurrent ? `${meta.dot} border-current`
                    : 'bg-white dark:bg-white/[0.05] border-[#d2d2d7] dark:border-white/[0.15]'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-current"/>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#d2d2d7] dark:bg-white/20"/>
                    )}
                  </div>
                  <p className={`text-[9px] font-medium text-center leading-tight max-w-[60px] ${
                    isCurrent ? 'text-[#0f172a] dark:text-white font-semibold'
                    : isCompleted ? 'text-[#1e40af] dark:text-blue-400'
                    : 'text-[#94a3b8] dark:text-white/25'
                  }`}>{meta.label}</p>
                </div>
                {!isLast && <div className={`h-0.5 flex-1 mx-1 mb-5 ${idx < currentIdx ? 'bg-[#1e40af]' : 'bg-[#e2e8f0] dark:bg-white/[0.08]'}`}/>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-wider mb-3">
            Productos ({order.items.length})
          </p>
          <div className="bg-white dark:bg-[#0d1525] border border-[#d2d2d7] dark:border-white/[0.07] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d2d2d7] dark:border-white/[0.07] bg-[#f5f5f7] dark:bg-white/[0.04]">
                  <th className="text-left px-3 py-2 text-xs text-[#6e6e73] dark:text-white/40 font-medium">Producto</th>
                  <th className="text-center px-3 py-2 text-xs text-[#6e6e73] dark:text-white/40 font-medium">Cant.</th>
                  <th className="text-right px-3 py-2 text-xs text-[#6e6e73] dark:text-white/40 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7] dark:divide-white/[0.06]">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-[#1d1d1f] dark:text-white text-xs">{item.product_name || `#${item.product_id}`}</p>
                      {item.product_sku && <p className="font-mono text-[10px] text-[#86868b] dark:text-white/35">{item.product_sku}</p>}
                    </td>
                    <td className="px-3 py-2 text-center text-[#6e6e73] dark:text-white/40">×{item.quantity}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#1d1d1f] dark:text-white text-xs">
                      ${(item.unit_price * item.quantity).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {order.invoice_rut && (
            <div>
              <p className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-wider mb-3">Datos de Factura</p>
              <div className="bg-white dark:bg-[#0d1525] border border-[#d2d2d7] dark:border-white/[0.07] rounded-xl p-4 space-y-2">
                <InfoRow label="Razón Social" value={order.invoice_business_name}/>
                <InfoRow label="RUT"          value={order.invoice_rut}/>
                <InfoRow label="Giro"         value={order.invoice_business_activity}/>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-wider mb-3">Actualizar Estado</p>
            <div className="bg-white dark:bg-[#0d1525] border border-[#d2d2d7] dark:border-white/[0.07] rounded-xl p-4 space-y-3">
              {nextStatus && (
                <button onClick={() => onUpdate(order.id, nextStatus)} disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 bg-[#1e40af] hover:bg-[#1d4ed8] text-white text-sm font-medium py-2.5 rounded-lg transition-all disabled:opacity-50">
                  {isUpdating
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <>Avanzar a "{STATUS_META[nextStatus]?.label}" <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg></>
                  }
                </button>
              )}
              {order.status === 'Delivered' && (
                <p className="text-xs text-[#6e6e73] dark:text-white/40 text-center py-1">Orden completada</p>
              )}
              <div className="flex gap-2 pt-1">
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                  className="flex-1 input-field text-xs py-1.5">
                  {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_META[s]?.label}</option>)}
                </select>
                <button onClick={() => onUpdate(order.id, selectedStatus)}
                  disabled={isUpdating || selectedStatus === order.status}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className="bg-white dark:bg-[#0d1525] border border-[#d2d2d7] dark:border-white/[0.07] rounded-2xl p-5 flex items-center gap-4 shadow-sm dark:shadow-none">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color} shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight">{value}</p>
        <p className="text-xs text-[#6e6e73] dark:text-white/40 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'bg-[#f5f5f7] text-[#6e6e73] border-[#d2d2d7] dark:bg-white/[0.05] dark:text-white/40 dark:border-white/[0.08]', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
      {meta.label}
    </span>
  )
}

function FilterChip({ active, onClick, dot, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
        active
          ? 'bg-[#1e40af] text-white border-[#1e40af]'
          : 'bg-white dark:bg-white/[0.04] text-[#64748b] dark:text-white/50 border-[#e2e8f0] dark:border-white/[0.08] hover:border-[#94a3b8] dark:hover:border-white/20'
      }`}>
      {dot && !active && <span className={`w-1.5 h-1.5 rounded-full ${dot}`}/>}
      {children}
    </button>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs text-[#86868b] dark:text-white/35 w-24 shrink-0">{label}</span>
      <span className="text-[#1d1d1f] dark:text-white font-medium">{value}</span>
    </div>
  )
}

const ClipboardIcon  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
const ClockIcon      = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
const CurrencyIcon   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
const CheckCircleIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
