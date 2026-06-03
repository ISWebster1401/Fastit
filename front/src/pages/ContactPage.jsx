import { useState } from 'react'
import { Link } from 'react-router-dom'

const SUBJECTS = [
  'Consulta técnica de producto',
  'Estado de mi orden',
  'Facturación o documentos',
  'Cotización especial / volumen',
  'Problema con el pago',
  'Otro',
]

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent]     = useState(false)
  const [sending, setSending] = useState(false)

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    setSending(true)
    // mailto fallback — se puede reemplazar por un endpoint real cuando haya uno
    const mailto = `mailto:soporte@fastit.cl?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(
      `Nombre: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    )}`
    window.location.href = mailto
    setTimeout(() => { setSending(false); setSent(true) }, 800)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0f172a] dark:text-white">Contacto y soporte</h1>
        <p className="text-sm text-[#64748b] dark:text-white/40 mt-1">
          Nuestro equipo responde en menos de 24 horas hábiles.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {[
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ),
            label: 'Email',
            value: 'soporte@fastit.cl',
            href:  'mailto:soporte@fastit.cl',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
            label: 'WhatsApp',
            value: '+56 9 XXXX XXXX',
            href:  'https://wa.me/569XXXXXXXX',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            label: 'Horario',
            value: 'Lun–Vie 9–18 hrs',
            href:  null,
          },
        ].map(({ icon, label, value, href }) => (
          <div key={label} className="card p-4 flex flex-col items-center text-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-[#eff6ff] dark:bg-blue-500/10 text-[#1e40af] dark:text-blue-400 flex items-center justify-center">
              {icon}
            </span>
            <p className="text-xs font-medium text-[#64748b] dark:text-white/40">{label}</p>
            {href ? (
              <a href={href} className="text-sm font-medium text-[#1e40af] dark:text-blue-400 hover:underline">{value}</a>
            ) : (
              <p className="text-sm font-medium text-[#0f172a] dark:text-white">{value}</p>
            )}
          </div>
        ))}
      </div>

      {sent ? (
        <div className="card p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-[#0f172a] dark:text-white">¡Mensaje enviado!</p>
          <p className="text-sm text-[#64748b] dark:text-white/40">Te responderemos a <strong>{form.email}</strong> a la brevedad.</p>
          <Link to="/" className="btn-secondary inline-block mt-2">Volver al inicio</Link>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-[#0f172a] dark:text-white mb-5">Envíanos un mensaje</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Nombre</label>
                <input name="name" value={form.name} onChange={handle} required className="input-field" placeholder="Tu nombre" />
              </div>
              <div>
                <label className="field-label">Email de contacto</label>
                <input name="email" type="email" value={form.email} onChange={handle} required className="input-field" placeholder="tu@email.cl" />
              </div>
            </div>
            <div>
              <label className="field-label">Asunto</label>
              <select name="subject" value={form.subject} onChange={handle} required className="input-field">
                <option value="">Selecciona un motivo</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Mensaje</label>
              <textarea
                name="message" value={form.message} onChange={handle} required
                rows={5} className="input-field resize-none"
                placeholder="Describe tu consulta con el mayor detalle posible…"
              />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full">
              {sending ? 'Abriendo correo…' : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
