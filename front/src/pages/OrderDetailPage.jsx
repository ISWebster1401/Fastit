import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/cartStore'
import { getOrder } from '../api/client'

const STEPS = [
  { key: 'Pending',               label: 'Orden recibida',         desc: 'Tu pedido fue registrado correctamente.' },
  { key: 'Supplier_Ordered',      label: 'Pedido al proveedor',     desc: 'Confirmamos disponibilidad con el proveedor.' },
  { key: 'In_Transit_to_Nadilop', label: 'En tránsito',            desc: 'El producto viene en camino a nuestra bodega.' },
  { key: 'Ready_to_Ship',         label: 'Listo para despacho',     desc: 'El producto está embalado y listo para enviarse.' },
  { key: 'Shipped',               label: 'Enviado',                 desc: 'Tu pedido está en camino contigo.' },
  { key: 'Delivered',             label: 'Entregado',               desc: 'Pedido entregado exitosamente.' },
]

const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]))

const DOC_LABEL = { Boleta: 'Boleta', Factura: 'Factura' }

export default function OrderDetailPage() {
  const { id }   = useParams()
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    getOrder(id)
      .then(setOrder)
      .catch(() => setError('Orden no encontrada o no tienes acceso.'))
      .finally(() => setLoading(false))
  }, [id, user, navigate])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-[#6e6e73] dark:text-white/40">
      Cargando orden…
    </div>
  )

  if (error || !order) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-sm text-red-600 mb-4">{error || 'Orden no encontrada.'}</p>
      <Link to="/orders" className="btn-secondary">Ver mis órdenes</Link>
    </div>
  )

  const currentStep = STEP_INDEX[order.status] ?? 0

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/orders" className="text-xs text-[#64748b] dark:text-white/40 hover:text-[#1e40af] transition-colors">
            ← Mis órdenes
          </Link>
          <h1 className="text-2xl font-semibold text-[#0f172a] dark:text-white mt-1">
            Orden <span className="font-mono">#{order.id}</span>
          </h1>
          <p className="text-xs text-[#6e6e73] dark:text-white/40 mt-0.5">
            {order.created_at
              ? new Date(order.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <span className="text-xl font-semibold text-[#0f172a] dark:text-white">
          ${Number(order.total_amount).toLocaleString('es-CL')}
          <span className="text-xs font-normal text-[#64748b] dark:text-white/40 ml-1">neto</span>
        </span>
      </div>

      {/* Stepper */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white mb-5">Estado del pedido</h2>
        <ol className="relative border-l border-[#e2e8f0] dark:border-white/[0.08] ml-3 space-y-6">
          {STEPS.map((step, i) => {
            const done    = i < currentStep
            const current = i === currentStep
            return (
              <li key={step.key} className="ml-5">
                <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  done    ? 'border-[#1e40af] bg-[#1e40af] dark:border-blue-500 dark:bg-blue-500' :
                  current ? 'border-[#1e40af] bg-white dark:border-blue-400 dark:bg-[#0d1525]' :
                            'border-[#e2e8f0] bg-white dark:border-white/[0.12] dark:bg-[#0d1525]'
                }`}>
                  {done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {current && <span className="w-2 h-2 rounded-full bg-[#1e40af] dark:bg-blue-400" />}
                </span>
                <p className={`text-sm font-medium leading-none ${
                  done || current
                    ? 'text-[#0f172a] dark:text-white'
                    : 'text-[#94a3b8] dark:text-white/25'
                }`}>
                  {step.label}
                </p>
                {(done || current) && (
                  <p className="mt-1 text-xs text-[#64748b] dark:text-white/40">{step.desc}</p>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="bg-[#f8fafc] dark:bg-white/[0.04] border-b border-[#e2e8f0] dark:border-white/[0.07] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">Productos</h2>
        </div>
        <ul className="divide-y divide-[#e2e8f0] dark:divide-white/[0.07]">
          {order.items.map((item, idx) => (
            <li key={idx} className="px-5 py-3 flex justify-between items-center text-sm">
              <div>
                <p className="font-medium text-[#0f172a] dark:text-white">
                  {item.product_name || `Producto #${item.product_id}`}
                </p>
                {item.product_sku && (
                  <p className="text-xs text-[#64748b] dark:text-white/40 font-mono">{item.product_sku}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium text-[#0f172a] dark:text-white">
                  ${(item.unit_price * item.quantity).toLocaleString('es-CL')}
                </p>
                <p className="text-xs text-[#64748b] dark:text-white/40">
                  {item.quantity} × ${item.unit_price.toLocaleString('es-CL')}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {order.shipping_cost > 0 && (
          <div className="px-5 py-3 flex justify-between text-sm border-t border-[#e2e8f0] dark:border-white/[0.07] text-[#64748b] dark:text-white/40">
            <span>Despacho {order.shipping_commune && `→ ${order.shipping_commune}`}</span>
            <span>${Number(order.shipping_cost).toLocaleString('es-CL')}</span>
          </div>
        )}
        <div className="px-5 py-3 flex justify-between text-sm font-semibold border-t border-[#e2e8f0] dark:border-white/[0.07] bg-[#f8fafc] dark:bg-white/[0.04]">
          <span className="text-[#0f172a] dark:text-white">Total neto</span>
          <span className="text-[#0f172a] dark:text-white">${Number(order.total_amount).toLocaleString('es-CL')}</span>
        </div>
      </div>

      {/* Billing + Shipping */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            {DOC_LABEL[order.document_type] || order.document_type}
          </h2>
          {order.document_type === 'Factura' ? (
            <div className="text-sm text-[#374151] dark:text-white/60 space-y-0.5">
              <p>{order.invoice_business_name}</p>
              <p className="text-[#64748b] dark:text-white/40 text-xs">{order.invoice_rut}</p>
              <p className="text-[#64748b] dark:text-white/40 text-xs">{order.invoice_business_activity}</p>
            </div>
          ) : (
            <div className="text-sm text-[#374151] dark:text-white/60 space-y-0.5">
              <p>{order.boleta_full_name}</p>
              <p className="text-[#64748b] dark:text-white/40 text-xs">{order.boleta_rut}</p>
              <p className="text-[#64748b] dark:text-white/40 text-xs">{order.boleta_email}</p>
            </div>
          )}
        </div>

        {order.shipping_address && (
          <div className="card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">Dirección de envío</h2>
            <div className="text-sm text-[#374151] dark:text-white/60 space-y-0.5">
              <p>{order.shipping_address}</p>
              <p className="text-[#64748b] dark:text-white/40 text-xs">
                {[order.shipping_commune, order.shipping_region].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link to="/orders" className="btn-secondary">Ver todas mis órdenes</Link>
        <Link to="/contact" className="btn-secondary">Consultar soporte</Link>
      </div>
    </div>
  )
}
