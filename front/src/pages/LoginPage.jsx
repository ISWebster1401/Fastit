import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/useAuth'

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un email válido'),
  password: z.string().min(1, 'Contraseña requerida'),
  remember: z.boolean().default(true),
})

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'Campo requerido'),
  lastName: z.string().trim().min(2, 'Campo requerido'),
  email: z.string().trim().email('Ingresa un email válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  isCompany: z.boolean().default(false),
  acceptedTerms: z.boolean().refine(Boolean, 'Debes aceptar los términos'),
  rut: z.string().optional(),
  razonSocial: z.string().optional(),
  giro: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Las contraseñas no coinciden',
    })
  }

  if (!data.isCompany) return

  ;[
    ['rut', 'Campo requerido'],
    ['razonSocial', 'Campo requerido'],
    ['giro', 'Campo requerido'],
  ].forEach(([field, message]) => {
    if (!data[field]?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message,
      })
    }
  })
})

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  remember: true,
  isCompany: false,
  acceptedTerms: false,
  rut: '',
  razonSocial: '',
  giro: '',
}

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [error, setError] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()

  const schema = useMemo(
    () => mode === 'login' ? loginSchema : registerSchema,
    [mode],
  )

  const {
    register: registerField,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues,
  })

  const isCompany = useWatch({ control, name: 'isCompany' })
  const remember = useWatch({ control, name: 'remember' })
  const acceptedTerms = useWatch({ control, name: 'acceptedTerms' })

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError(null)
    reset(defaultValues)
  }

  const onSubmit = async (values) => {
    setError(null)
    try {
      if (mode === 'login') {
        await auth.login({
          email: values.email,
          password: values.password,
        })
      } else {
        await auth.register({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          isCompany: values.isCompany,
          ...(values.isCompany
            ? {
                rut: values.rut,
                razonSocial: values.razonSocial,
                giro: values.giro,
              }
            : {}),
        })
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error de autenticación. Verifica tus datos.')
    }
  }

  return (
    <main className="auth-page">
      <BrandPanel />

      <section className="auth-panel">
        <div className="auth-mobile-bar">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#1e40af] text-white">
              <Logomark className="h-[14px] w-[14px]" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[#0f172a]">
              Fast-IT
            </span>
          </div>
          <SegmentedToggle mode={mode} onChange={switchMode} />
        </div>

        <div className="auth-form-shell">
          <div className="auth-form-inner">
            <div className="auth-desktop-toggle">
              <SegmentedToggle mode={mode} onChange={switchMode} />
            </div>

            <header className="auth-heading">
              <h2>
                {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
              </h2>
              <p>
                {mode === 'login'
                  ? 'Ingresa a tu cuenta Fast-IT'
                  : 'Empieza a comprar hardware en minutos'}
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
              {mode === 'register' && (
                <div className="auth-grid">
                  <AuthInput
                    label="Nombre"
                    autoComplete="given-name"
                    icon={<UserIcon />}
                    error={errors.firstName?.message}
                    {...registerField('firstName')}
                  />
                  <AuthInput
                    label="Apellido"
                    autoComplete="family-name"
                    error={errors.lastName?.message}
                    {...registerField('lastName')}
                  />
                </div>
              )}

              <AuthInput
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                icon={<MailIcon />}
                error={errors.email?.message}
                {...registerField('email')}
              />

              <AuthInput
                label="Contraseña"
                type={showPass ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                icon={<LockIcon />}
                error={errors.password?.message}
                endAdornment={
                  <PasswordToggle show={showPass} onToggle={() => setShowPass(v => !v)} />
                }
                {...registerField('password')}
              />

              {mode === 'register' && (
                <>
                  <AuthInput
                    label="Confirmar contraseña"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    icon={<LockIcon />}
                    error={errors.confirmPassword?.message}
                    {...registerField('confirmPassword')}
                  />

                  <CompanySwitch
                    checked={Boolean(isCompany)}
                    inputProps={registerField('isCompany')}
                  />

                  {isCompany && (
                    <div className="flex flex-col gap-3">
                      <AuthInput
                        label="RUT"
                        placeholder="12.345.678-9"
                        icon={<FileIcon />}
                        error={errors.rut?.message}
                        {...registerField('rut')}
                      />
                      <AuthInput
                        label="Razón social"
                        icon={<BuildingIcon />}
                        error={errors.razonSocial?.message}
                        {...registerField('razonSocial')}
                      />
                      <AuthInput
                        label="Giro"
                        error={errors.giro?.message}
                        {...registerField('giro')}
                      />
                    </div>
                  )}
                </>
              )}

              {mode === 'login' ? (
                <div className="auth-row">
                  <CheckboxLabel
                    label="Recordar sesión"
                    checked={Boolean(remember)}
                    inputProps={registerField('remember')}
                  />
                  <Link
                    to="/forgot-password"
                    className="text-[13px] font-medium text-[#1e40af] transition-colors hover:text-[#1d3da3]"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              ) : (
                <>
                  <CheckboxLabel
                    label={
                      <span>
                        Acepto los{' '}
                        <a href="#" className="font-medium text-[#1e40af] hover:underline">
                          Términos
                        </a>{' '}
                        y la{' '}
                        <a href="#" className="font-medium text-[#1e40af] hover:underline">
                          Política de Privacidad
                        </a>
                        .
                      </span>
                    }
                    checked={Boolean(acceptedTerms)}
                    inputProps={registerField('acceptedTerms')}
                  />
                  {errors.acceptedTerms && (
                    <p className="-mt-2 pl-7 text-[12px] text-[#ef4444]">
                      {errors.acceptedTerms.message}
                    </p>
                  )}
                </>
              )}

              {error && (
                <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="auth-submit group"
              >
                {isSubmitting
                  ? 'Procesando...'
                  : mode === 'login'
                    ? 'Iniciar sesión'
                    : 'Crear cuenta'}
                <ArrowIcon />
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="auth-guest"
              >
                Comprar como invitado
              </button>

              <p className="auth-link-text">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="font-medium text-[#1e40af] transition-colors hover:text-[#1d3da3]"
                >
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </p>
            </form>

            <p className="auth-footer-note">
              Protegido con cifrado de extremo a extremo.
              <br className="sm:hidden" />{' '}
              <a href="#" className="transition-colors hover:text-[#64748b]">
                Conoce cómo cuidamos tus datos
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function BrandPanel() {
  return (
    <aside className="auth-brand" aria-label="Fast-IT">
      <ServerRackTexture className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" />

      <div className="relative z-10 flex items-center gap-2 px-12 pt-10">
        <Logomark className="h-6 w-6 text-white" />
        <span className="text-[17px] font-semibold tracking-tight text-white">
          Fast-IT
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center">
        <h1 className="max-w-xl text-balance text-[44px] font-light leading-[1.05] tracking-[-0.03em] text-white xl:text-[52px]">
          Hardware crítico.
          <br />
          <span className="text-[#BFDBFE]">Entrega precisa.</span>
        </h1>

        <p className="mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-white/70">
          Conectamos tu operación con el stock que necesitas, cuando lo necesitas.
          Asesoría experta y precios netos.
        </p>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {['Stock en tiempo real', 'Asesor técnico IA', 'Boleta y Factura'].map(feature => (
            <li
              key={feature}
              className="rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-medium tracking-wide text-white/85 backdrop-blur-[2px]"
            >
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 flex items-center justify-between px-12 pb-8 text-[12px] text-white/50">
        <span>© {new Date().getFullYear()} Fast-IT</span>
        <div className="flex gap-6">
          <a href="#" className="transition-colors hover:text-white/80">Privacidad</a>
          <a href="#" className="transition-colors hover:text-white/80">Términos</a>
          <a href="#" className="transition-colors hover:text-white/80">Soporte</a>
        </div>
      </div>
    </aside>
  )
}

function SegmentedToggle({ mode, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Login o registro"
      className="auth-toggle"
    >
      {['login', 'register'].map(tab => {
        const active = mode === tab
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={active ? 'is-active' : ''}
          >
            {tab === 'login' ? 'Iniciar sesión' : 'Registro'}
          </button>
        )
      })}
    </div>
  )
}

function AuthInput({ label, icon, error, endAdornment, ...props }) {
  return (
    <div className="auth-field">
      <div
        className={`auth-field-box ${error ? 'has-error' : ''}`}
      >
        {icon ? (
          <span className="auth-field-icon">
            {icon}
          </span>
        ) : (
          <span className="w-4" aria-hidden="true" />
        )}

        <div className="auth-field-input-wrap">
          <input
            placeholder=" "
            className="auth-field-input"
            {...props}
          />
          <label className="auth-field-label">
            {label}
          </label>
        </div>

        {endAdornment && (
          <div className="flex items-center gap-1 pr-3">
            {endAdornment}
          </div>
        )}
      </div>
      {error && (
        <p className="auth-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function CompanySwitch({ checked, inputProps }) {
  return (
    <div className="mt-1 flex items-center justify-between rounded-[10px] bg-[#f8fafc] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#1e40af] ring-1 ring-[#e2e8f0]">
          <BriefcaseIcon />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-medium text-[#0f172a]">
            Compro como empresa
          </p>
          <p className="text-[11px] text-[#64748b]">
            Facturación con RUT empresa y cuentas corporativas
          </p>
        </div>
      </div>

      <label
        className={`relative h-[26px] w-[44px] rounded-full transition-colors duration-300 ${
          checked ? 'bg-[#3b82f6]' : 'bg-[#cbd5e1]'
        }`}
      >
        <input type="checkbox" className="sr-only" {...inputProps} />
        <span
          className="absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-all duration-300"
          style={{ left: checked ? '21px' : '3px' }}
        />
      </label>
    </div>
  )
}

function CheckboxLabel({ label, checked, inputProps }) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-2 text-[13px] text-[#475569]">
      <span
        className={`mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all ${
          checked ? 'border-[#1e40af] bg-[#1e40af]' : 'border-[#cbd5e1] bg-white'
        }`}
      >
        <input type="checkbox" className="sr-only" {...inputProps} />
        {checked && (
          <svg viewBox="0 0 12 12" className="h-[10px] w-[10px] text-white">
            <path
              d="M2 6.5L5 9.5L10 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </span>
      <span className="leading-relaxed">{label}</span>
    </label>
  )
}

function PasswordToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:text-[#1e40af] focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-[#BFDBFE]"
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function Logomark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2" y="15" width="20" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="6" r="0.9" fill="currentColor" />
      <circle cx="6" cy="18" r="0.9" fill="currentColor" />
      <path d="M17 6h2M17 18h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ServerRackTexture({ className }) {
  return (
    <svg className={className} viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="rack" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30) skewX(-15)">
          <rect x="2" y="2" width="76" height="36" rx="2" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="10" cy="20" r="1.4" fill="white" />
          <circle cx="16" cy="20" r="1.4" fill="white" />
          <rect x="28" y="14" width="44" height="12" rx="1.5" fill="white" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="800" height="800" fill="url(#rack)" />
    </svg>
  )
}

function MailIcon() {
  return <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
}

function LockIcon() {
  return <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
}

function UserIcon() {
  return <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14z" /></svg>
}

function BriefcaseIcon() {
  return <svg className="h-[16px] w-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10 6h4a2 2 0 012 2v1h3a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h3V8a2 2 0 012-2zm0 3h4V8h-4v1z" /></svg>
}

function FileIcon() {
  return <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 0v5h5M9 13h6M9 17h6" /></svg>
}

function BuildingIcon() {
  return <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M8 7h1M8 11h1M8 15h1M13 7h1M13 11h1M13 15h1M3 21h18" /></svg>
}

function EyeIcon() {
  return <svg className="h-[16px] w-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}

function EyeOffIcon() {
  return <svg className="h-[16px] w-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.08A9.9 9.9 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.8 10.8 0 01-3.07 4.37M6.1 6.1A10.7 10.7 0 002.46 12a10.96 10.96 0 006.28 6.44" /></svg>
}

function ArrowIcon() {
  return <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6l6 6-6 6" /></svg>
}
