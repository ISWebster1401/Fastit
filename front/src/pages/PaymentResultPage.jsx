import { useSearchParams, Link } from 'react-router-dom'

const STATUS = {
  success: {
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
      </svg>
    ),
    bg:       'bg-emerald-50 dark:bg-emerald-500/10',
    color:    'text-emerald-600 dark:text-emerald-400',
    title:    'Pago exitoso',
    subtitle: 'Tu orden fue procesada. Disparamos la orden de compra al proveedor.',
  },
  failed: {
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
      </svg>
    ),
    bg:       'bg-red-50 dark:bg-red-500/10',
    color:    'text-red-600 dark:text-red-400',
    title:    'Pago rechazado',
    subtitle: 'La transacción no fue aprobada. Puedes intentar nuevamente.',
  },
  cancelled: {
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
      </svg>
    ),
    bg:       'bg-amber-50 dark:bg-amber-500/10',
    color:    'text-amber-600 dark:text-amber-400',
    title:    'Pago cancelado',
    subtitle: 'Cancelaste la transacción. Tu orden quedó pendiente en el sistema.',
  },
  error: {
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
    ),
    bg:       'bg-slate-50 dark:bg-white/[0.04]',
    color:    'text-slate-500 dark:text-white/40',
    title:    'Error en el pago',
    subtitle: 'Ocurrió un error inesperado. Contacta a soporte@fastit.cl',
  },
}

export default function PaymentResultPage() {
  const [params]  = useSearchParams()
  const status    = params.get('status') || 'error'
  const orderId   = params.get('order_id')
  const cfg       = STATUS[status] || STATUS.error
  const isSuccess = status === 'success'

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-8">

      <div className={`w-20 h-20 ${cfg.bg} ${cfg.color} rounded-full flex items-center justify-center mx-auto`}>
        {cfg.icon}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">{cfg.title}</h1>
        <p className="text-[#6e6e73] dark:text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
          {cfg.subtitle}
        </p>
        {isSuccess && orderId && (
          <p className="text-xs text-[#94a3b8] dark:text-white/30 font-mono mt-1">
            Orden #{orderId}
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {isSuccess ? (
          <>
            <Link to="/orders" className="btn-primary px-6">
              Ver mis órdenes
            </Link>
            <Link to="/" className="btn-secondary px-6">
              Seguir comprando
            </Link>
          </>
        ) : (
          <>
            <Link to="/checkout" className="btn-primary px-6">
              Intentar de nuevo
            </Link>
            <Link to="/" className="btn-secondary px-6">
              Ir al catálogo
            </Link>
          </>
        )}
      </div>

      {/* Transbank branding */}
      <p className="text-[10px] text-[#94a3b8] dark:text-white/20 tracking-wider uppercase">
        Procesado por Transbank WebpayPlus
      </p>
    </div>
  )
}
