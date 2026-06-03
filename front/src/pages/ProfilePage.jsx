import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/cartStore'
import { updateProfile, changePassword } from '../api/client'

export default function ProfilePage() {
  const user    = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.login)
  const token   = useAuthStore(s => s.token)
  const navigate = useNavigate()

  if (!user) { navigate('/login'); return null }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="border-b border-[#e2e8f0] dark:border-white/[0.07] pb-4">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Mi Perfil</h1>
        <p className="text-sm text-[#6e6e73] dark:text-white/40 mt-1">{user.email}</p>
      </div>

      <ProfileForm user={user} onSaved={(updated) => setUser({ access_token: token, user: updated })} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    business_name:     user.business_name     || '',
    business_activity: user.business_activity || '',
    rut:               user.rut               || '',
  })
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState(null)

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const updated = await updateProfile(form)
      onSaved(updated)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">Datos de cuenta</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label">Correo electrónico</label>
          <input value={user.email} disabled className="input-field opacity-50 cursor-not-allowed" />
        </div>
        {user.is_company && (
          <>
            <div>
              <label className="field-label">RUT empresa</label>
              <input name="rut" value={form.rut} onChange={handle} className="input-field" placeholder="12.345.678-9" />
            </div>
            <div>
              <label className="field-label">Razón social</label>
              <input name="business_name" value={form.business_name} onChange={handle} className="input-field" />
            </div>
            <div>
              <label className="field-label">Giro</label>
              <input name="business_activity" value={form.business_activity} onChange={handle} className="input-field" />
            </div>
          </>
        )}

        {success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Perfil actualizado correctamente.</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setSuccess(false)
    if (form.next !== form.confirm) { setError('Las contraseñas nuevas no coinciden'); return }
    if (form.next.length < 8)      { setError('Mínimo 8 caracteres'); return }
    setSaving(true)
    try {
      await changePassword(form.current, form.next)
      setSuccess(true)
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">Cambiar contraseña</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label">Contraseña actual</label>
          <input name="current" type="password" value={form.current} onChange={handle} className="input-field" required />
        </div>
        <div>
          <label className="field-label">Nueva contraseña</label>
          <input name="next" type="password" value={form.next} onChange={handle} className="input-field" required />
        </div>
        <div>
          <label className="field-label">Confirmar nueva contraseña</label>
          <input name="confirm" type="password" value={form.confirm} onChange={handle} className="input-field" required />
        </div>

        {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">Contraseña cambiada exitosamente.</p>}
        {error   && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
