import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../store/cartStore'
import { checkout, createPayment, createFlowPayment } from '../api/client'
import Price from '../components/ui/Price'
import { useFormatPrice } from '../store/currencyStore'

function redirectToTransbank(url, token) {
  const form  = document.createElement('form')
  form.method = 'POST'
  form.action = url
  const input = document.createElement('input')
  input.type  = 'hidden'
  input.name  = 'token_ws'
  input.value = token
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}

export default function CheckoutPage() {
  const items       = useCartStore(s => s.items)
  const clearCart   = useCartStore(s => s.clearCart)
  const updateQty   = useCartStore(s => s.updateQty)
  const removeItem  = useCartStore(s => s.removeItem)
  const user        = useAuthStore(s => s.user)
  const navigate    = useNavigate()
  const formatPrice = useFormatPrice()

  const [docType, setDocType] = useState('Boleta')
  const [form, setForm]       = useState({
    invoice_rut: '', invoice_business_name: '', invoice_business_activity: '',
  })
  const [loading,   setLoading]   = useState(false)
  const [step,      setStep]      = useState('cart')
  const [error,     setError]     = useState(null)
  const [pasarela,  setPasarela]  = useState('transbank') // 'transbank' | 'flow'

  const total = items.reduce((sum, i) => sum + i.public_price * i.quantity, 0)

  const handleField = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const orderPayload = {
        document_type: docType,
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity })),
        ...(docType === 'Factura' ? form : {}),
      }
      const order = await checkout(orderPayload)
      clearCart()
      setStep('redirecting')
      if (pasarela === 'flow') {
        const { url } = await createFlowPayment(order.id)
        window.location.href = url
      } else {
        const { url, token } = await createPayment(order.id)
        redirectToTransbank(url, token)
      }
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(typeof msg === 'string' ? msg : 'Error al procesar. Intenta de nuevo.')
      setLoading(false)
      setStep('cart')
    }
  }

  if (step === 'redirecting') return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-6">
      <div className="flex justify-center gap-2">
        {[0, 120, 240].map(d => (
          <div key={d} className="w-2.5 h-2.5 rounded-full bg-[#1e40af] animate-bounce"
               style={{ animationDelay: `${d}ms` }}/>
        ))}
      </div>
      <div>
        <p className="font-semibold text-[#1d1d1f] dark:text-white">Redirigiendo a Transbank…</p>
        <p className="text-sm text-[#6e6e73] dark:text-white/40 mt-1">No cierres esta ventana.</p>
      </div>
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <div className="w-16 h-16 bg-white dark:bg-white/[0.05] border border-[#d2d2d7] dark:border-white/[0.08]
                      rounded-2xl flex items-center justify-center mx-auto text-[#6e6e73] dark:text-white/30">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <p className="text-[#6e6e73] dark:text-white/40 text-sm">El carrito está vacío.</p>
      <Link to="/" className="btn-primary inline-block">Ver catálogo</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white mb-8
                     border-b border-[#d2d2d7] dark:border-white/[0.07] pb-4">
        Finalizar compra
      </h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-8">
        {/* Columna izquierda */}
        <div className="md:col-span-3 space-y-6">

          {/* Lista de productos */}
          <div className="card overflow-hidden">
            <div className="bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-[#d2d2d7] dark:border-white/[0.07] px-4 py-3">
              <h2 className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-widest">
                Productos ({items.length})
              </h2>
            </div>
            <ul className="divide-y divide-[#d2d2d7] dark:divide-white/[0.06]">
              {items.map(item => (
                <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-[#86868b] dark:text-white/35">{item.sku}</p>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full border border-[#d2d2d7] dark:border-white/[0.12]
                                 text-[#6e6e73] dark:text-white/50
                                 hover:bg-[#f5f5f7] dark:hover:bg-white/[0.08]
                                 text-sm flex items-center justify-center transition-colors">
                      −
                    </button>
                    <span className="text-sm w-6 text-center font-medium text-[#1d1d1f] dark:text-white">
                      {item.quantity}
                    </span>
                    <button type="button" onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full border border-[#d2d2d7] dark:border-white/[0.12]
                                 text-[#6e6e73] dark:text-white/50
                                 hover:bg-[#f5f5f7] dark:hover:bg-white/[0.08]
                                 text-sm flex items-center justify-center transition-colors">
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white w-28 text-right">
                    {formatPrice(item.public_price * item.quantity)}
                  </p>
                  <button type="button" onClick={() => removeItem(item.id)}
                    className="text-[#86868b] dark:text-white/25 hover:text-red-500 dark:hover:text-red-400
                               transition-colors text-lg ml-1">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Tipo de documento */}
          <div className="card p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-widest">
              Tipo de Documento
            </h2>
            <div className="flex gap-3">
              {['Boleta', 'Factura'].map(type => (
                <label key={type}
                  className={`flex-1 border rounded-xl p-3 cursor-pointer text-center transition-all ${
                    docType === type
                      ? 'border-[#1e40af] bg-[#eff6ff] text-[#1e40af] font-semibold dark:border-blue-500 dark:bg-blue-500/[0.15] dark:text-blue-300'
                      : 'border-[#d2d2d7] dark:border-white/[0.1] text-[#6e6e73] dark:text-white/40 hover:border-[#86868b] dark:hover:border-white/25'
                  }`}
                >
                  <input type="radio" className="sr-only" value={type}
                    checked={docType === type} onChange={() => setDocType(type)} />
                  <span className="text-sm">{type}</span>
                  <p className="text-xs mt-0.5 font-normal opacity-70">
                    {type === 'Boleta' ? 'Persona natural' : 'Empresa / RUT'}
                  </p>
                </label>
              ))}
            </div>

            {docType === 'Factura' && (
              <div className="space-y-3 border-t border-[#d2d2d7] dark:border-white/[0.07] pt-4">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">RUT Empresa *</label>
                  <input name="invoice_rut" value={form.invoice_rut} onChange={handleField}
                    placeholder="76.123.456-7" required className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">Razón Social *</label>
                  <input name="invoice_business_name" value={form.invoice_business_name} onChange={handleField}
                    placeholder="Empresa Ejemplo SpA" required className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">Giro Comercial *</label>
                  <input name="invoice_business_activity" value={form.invoice_business_activity} onChange={handleField}
                    placeholder="Servicios de tecnología" required className="input-field" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20
                            text-red-700 dark:text-red-400 text-sm rounded-xl p-3">
              {error}
            </div>
          )}
        </div>

        {/* Columna derecha: resumen */}
        <div className="md:col-span-2">
          <div className="card p-5 space-y-4 sticky top-24">
            <h2 className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-widest">
              Resumen de Orden
            </h2>

            <div className="space-y-2 text-sm">
              {items.map(i => (
                <div key={i.id} className="flex justify-between text-[#6e6e73] dark:text-white/50">
                  <span className="truncate max-w-[140px]">{i.name} ×{i.quantity}</span>
                  <span>{formatPrice(i.public_price * i.quantity)}</span>
                </div>
              ))}
            </div>

            <hr className="border-[#d2d2d7] dark:border-white/[0.07]" />

            <div className="flex justify-between font-semibold text-[#1d1d1f] dark:text-white">
              <span>Total neto</span>
              <Price amount={total} />
            </div>

            {!user && (
              <div className="bg-amber-50 dark:bg-amber-500/[0.12] border border-amber-200 dark:border-amber-500/30
                              text-amber-800 dark:text-amber-300 text-xs rounded-lg p-3">
                Debes <Link to="/login" className="underline font-semibold">iniciar sesión</Link> para completar la compra.
              </div>
            )}

            {/* Selector de pasarela */}
            <div>
              <p className="text-xs text-[#6e6e73] dark:text-white/40 mb-2">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'transbank', label: 'Transbank', sub: 'WebpayPlus' },
                  { id: 'flow',      label: 'Flow',       sub: 'flow.cl'    },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPasarela(p.id)}
                    className={`rounded-xl border py-2.5 px-3 text-left transition-all ${
                      pasarela === p.id
                        ? 'border-[#1e40af] bg-[#eff6ff] dark:border-blue-500 dark:bg-blue-500/[0.12]'
                        : 'border-[#d2d2d7] dark:border-white/[0.1] hover:border-[#86868b] dark:hover:border-white/25'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${pasarela === p.id ? 'text-[#1e40af] dark:text-blue-300' : 'text-[#1d1d1f] dark:text-white'}`}>
                      {p.label}
                    </p>
                    <p className="text-[10px] text-[#6e6e73] dark:text-white/35">{p.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !user}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Procesando…
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  Pagar con {pasarela === 'flow' ? 'Flow' : 'Transbank'}
                </>
              )}
            </button>

            <p className="text-xs text-[#6e6e73] dark:text-white/30 text-center">
              Pago seguro vía {pasarela === 'flow' ? 'Flow.cl' : 'Transbank WebpayPlus'}
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
