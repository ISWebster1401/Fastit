import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/cartStore'
import { getUserOrders } from '../api/client'

const STATUS_LABELS = {
  Pending:               'Pendiente',
  Supplier_Ordered:      'Pedido al proveedor',
  In_Transit_to_Nadilop: 'En tránsito',
  Ready_to_Ship:         'Listo para envío',
  Shipped:               'Enviado',
  Delivered:             'Entregado',
}

const STATUS_COLORS = {
  Pending:               'bg-yellow-50 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
  Supplier_Ordered:      'bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  In_Transit_to_Nadilop: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  Ready_to_Ship:         'bg-purple-50 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300',
  Shipped:               'bg-orange-50 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
  Delivered:             'bg-green-50 text-green-800 dark:bg-green-500/20 dark:text-green-300',
}

export default function OrdersPage() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    getUserOrders()
      .then(setOrders)
      .catch(() => setError('No se pudieron cargar las órdenes.'))
      .finally(() => setLoading(false))
  }, [user, navigate])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#6e6e73] dark:text-white/40 text-sm">
      Cargando órdenes…
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-600 text-sm">{error}</div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 border-b border-[#d2d2d7] dark:border-white/[0.07] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Mis Órdenes</h1>
          <p className="text-[#6e6e73] dark:text-white/40 text-sm mt-1">
            {user?.business_name || user?.email}
          </p>
        </div>
        <Link to="/" className="btn-secondary text-sm">Catálogo</Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 bg-white dark:bg-white/[0.05] border border-[#d2d2d7] dark:border-white/[0.08]
                          rounded-2xl flex items-center justify-center mx-auto text-[#6e6e73] dark:text-white/30">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[#6e6e73] dark:text-white/40 text-sm">Aún no tienes órdenes.</p>
          <Link to="/" className="btn-primary inline-block">Ver catálogo</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="card overflow-hidden">
              {/* Header */}
              <div className="bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-[#d2d2d7] dark:border-white/[0.07]
                              px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-semibold text-[#1d1d1f] dark:text-white">
                    Orden #{order.id}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[order.status] || 'bg-[#f5f5f7] text-[#6e6e73] dark:bg-white/[0.05] dark:text-white/40'
                  }`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6e6e73] dark:text-white/40">
                  <span>{order.document_type}</span>
                  <span>{new Date(order.created_at).toLocaleDateString('es-CL', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}</span>
                </div>
              </div>

              {/* Items */}
              <div className="px-4 py-3">
                <ul className="space-y-1 text-sm text-[#1d1d1f] dark:text-white/80">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>Producto #{item.product_id} × {item.quantity}</span>
                      <span className="font-medium">
                        ${(item.unit_price * item.quantity).toLocaleString('es-CL')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="bg-[#f5f5f7] dark:bg-white/[0.04] border-t border-[#d2d2d7] dark:border-white/[0.07]
                              px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-[#6e6e73] dark:text-white/40">
                  {order.invoice_business_name && `${order.invoice_rut} | ${order.invoice_business_name}`}
                </span>
                <span className="font-semibold text-[#1d1d1f] dark:text-white">
                  Total neto: ${Number(order.total_amount).toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
