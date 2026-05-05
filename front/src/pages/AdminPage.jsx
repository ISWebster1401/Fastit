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
  const [tab,          setTab]          = useState('dashboard') // 'dashboard' | 'orders' | 'users'
  const [users,        setUsers]        = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

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
  }, [tab]) // eslint-disable-line

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
