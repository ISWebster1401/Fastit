import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../store/cartStore'
import { checkout, createPayment, createFlowPayment, getShippingCommunes, getShippingQuote } from '../api/client'

const fmtCLP = (n) => `$${Math.round(n).toLocaleString('es-CL')} CLP`

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

  // Tipo de cambio para mostrar en CLP
  const [exchangeRate, setExchangeRate] = useState(970)
  useEffect(() => {
    fetch('/api/exchange-rate').then(r => r.json()).then(d => {
      if (d?.rate > 0) setExchangeRate(d.rate)
    }).catch(() => {})
  }, [])

  const [docType, setDocType] = useState('Boleta')
  const [form, setForm]       = useState({
    invoice_rut: '', invoice_business_name: '', invoice_business_activity: '',
    boleta_full_name: '', boleta_rut: '', boleta_email: '',
  })
  const [loading,   setLoading]   = useState(false)
  const [step,      setStep]      = useState('cart')
  const [error,     setError]     = useState(null)

  // Envío
  const [communes,        setCommunes]        = useState([])
  const [communeSearch,   setCommuneSearch]   = useState('')
  const [selectedCommune, setSelectedCommune] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingQuote,   setShippingQuote]   = useState(null)  // { price_clp, service_name, days_estimate }
  const [quotingShipping, setQuotingShipping] = useState(false)
  const [shippingError,   setShippingError]   = useState(null)

  useEffect(() => {
    getShippingCommunes().then(setCommunes).catch(() => {})
  }, [])

  const filteredCommunes = communes.filter(c =>
    c.commune.toLowerCase().includes(communeSearch.toLowerCase())
  )

  const handleQuoteShipping = async () => {
    if (!selectedCommune) return
    setQuotingShipping(true)
    setShippingError(null)
    try {
      const totalClp  = items.reduce((s, i) => s + i.public_price * i.quantity, 0)
      const productIds = items.map(i => i.id)
      const q = await getShippingQuote(selectedCommune, productIds, Math.round(totalClp))
      setShippingQuote(q)
    } catch {
      setShippingError('No se pudo cotizar el envío. Intenta de nuevo.')
    } finally {
      setQuotingShipping(false)
    }
  }

  const pasarela     = 'transbank'
  const subtotalUSD  = items.reduce((sum, i) => sum + i.public_price * i.quantity, 0)
  const subtotalCLP  = Math.round(subtotalUSD * exchangeRate)
  const shippingCLP  = shippingQuote?.price_clp || 0
  const totalCLP     = subtotalCLP + shippingCLP

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
        ...(docType === 'Factura'
          ? {
              invoice_rut: form.invoice_rut,
              invoice_business_name: form.invoice_business_name,
              invoice_business_activity: form.invoice_business_activity,
            }
          : {
              boleta_full_name: form.boleta_full_name,
              boleta_rut: form.boleta_rut,
              boleta_email: form.boleta_email,
            }),
        shipping_address: shippingAddress || null,
        shipping_commune: selectedCommune || null,
        shipping_region:  shippingQuote?.region || null,
        shipping_cost:    shippingQuote?.price_clp || 0,
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
      <Link to="/catalog" className="btn-primary inline-block">Ver catálogo</Link>
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
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white w-36 text-right">
                    {fmtCLP(item.public_price * item.quantity * exchangeRate)}
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

            {docType === 'Boleta' && (
              <div className="space-y-3 border-t border-[#d2d2d7] dark:border-white/[0.07] pt-4">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">Nombre completo *</label>
                  <input name="boleta_full_name" value={form.boleta_full_name} onChange={handleField}
                    placeholder="Juan Pérez González" required className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">RUT *</label>
                  <input name="boleta_rut" value={form.boleta_rut} onChange={handleField}
                    placeholder="12.345.678-9" required className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">Email *</label>
                  <input type="email" name="boleta_email" value={form.boleta_email} onChange={handleField}
                    placeholder="tu@correo.cl" required className="input-field" />
                </div>
              </div>
            )}
          </div>

          {/* Dirección de envío */}
          <div className="card p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#6e6e73] dark:text-white/40 uppercase tracking-widest">
              Dirección de entrega
            </h2>

            <div>
              <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">
                Dirección (calle y número) *
              </label>
              <input
                value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                placeholder="Ej: Av. Providencia 1234, Dpto 502"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6e6e73] dark:text-white/50 mb-1">
                Comuna *
              </label>
              <input
                value={communeSearch || selectedCommune}
                onChange={e => { setCommuneSearch(e.target.value); setSelectedCommune(''); setShippingQuote(null) }}
                placeholder="Buscar comuna..."
                className="input-field"
              />
              {communeSearch && !selectedCommune && filteredCommunes.length > 0 && (
                <ul className="border border-[#d2d2d7] dark:border-white/[0.1] rounded-xl mt-1 max-h-44 overflow-y-auto bg-white dark:bg-[#1c1c1e] shadow-lg z-10 relative">
                  {filteredCommunes.slice(0, 12).map(c => (
                    <li
                      key={c.commune}
                      onClick={() => { setSelectedCommune(c.commune); setCommuneSearch('') }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-[#f5f5f7] dark:hover:bg-white/[0.05]
                                 text-[#1d1d1f] dark:text-white flex justify-between"
                    >
                      <span>{c.commune}</span>
                      <span className="text-xs text-[#86868b] dark:text-white/30">{c.region}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuoteShipping}
              disabled={!selectedCommune || quotingShipping}
              className="w-full py-2.5 rounded-xl border border-[#1e40af] text-[#1e40af] dark:text-blue-400
                         dark:border-blue-500 text-sm font-medium hover:bg-[#eff6ff] dark:hover:bg-blue-500/10
                         transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {quotingShipping ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Cotizando…
                </>
              ) : 'Calcular costo de envío'}
            </button>

            {shippingError && (
              <p className="text-xs text-red-600 dark:text-red-400">{shippingError}</p>
            )}

            {shippingQuote && (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10
                              border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {shippingQuote.service_name}
                  </p>
                  <p className="text-xs text-[#6e6e73] dark:text-white/40">{shippingQuote.days_estimate}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  ${shippingQuote.price_clp.toLocaleString('es-CL')} CLP
                </p>
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
                  <span>{fmtCLP(i.public_price * i.quantity * exchangeRate)}</span>
                </div>
              ))}
            </div>

            <hr className="border-[#d2d2d7] dark:border-white/[0.07]" />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#6e6e73] dark:text-white/50">
                <span>Subtotal</span>
                <span>{fmtCLP(subtotalCLP)}</span>
              </div>
              <div className="flex justify-between text-[#6e6e73] dark:text-white/50">
                <span>Envío Chilexpress</span>
                {shippingQuote
                  ? <span className="text-emerald-600 dark:text-emerald-400">+{fmtCLP(shippingCLP)}</span>
                  : <span className="italic text-xs">Por calcular</span>
                }
              </div>
            </div>

            <hr className="border-[#d2d2d7] dark:border-white/[0.07]" />

            <div className="flex justify-between font-semibold text-[#1d1d1f] dark:text-white">
              <span>Total</span>
              <span>{fmtCLP(totalCLP)}</span>
            </div>

            {!user && (
              <div className="bg-amber-50 dark:bg-amber-500/[0.12] border border-amber-200 dark:border-amber-500/30
                              text-amber-800 dark:text-amber-300 text-xs rounded-lg p-3">
                Debes <Link to="/login" className="underline font-semibold">iniciar sesión</Link> para completar la compra.
              </div>
            )}

            {/* Método de pago — solo Transbank por ahora */}
            <div>
              <p className="text-xs text-[#6e6e73] dark:text-white/40 mb-2">Método de pago</p>
              <div className="rounded-xl border border-[#1e40af] bg-[#eff6ff] dark:border-blue-500 dark:bg-blue-500/[0.12] py-2.5 px-3">
                <p className="text-xs font-semibold text-[#1e40af] dark:text-blue-300">Transbank Webpay</p>
                <p className="text-[10px] text-[#6e6e73] dark:text-white/35">
                  Pago seguro · Tarjetas de crédito y débito
                </p>
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
                  Pagar con Transbank
                </>
              )}
            </button>

            <p className="text-xs text-[#6e6e73] dark:text-white/30 text-center">
              Pago seguro vía Transbank Webpay
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
