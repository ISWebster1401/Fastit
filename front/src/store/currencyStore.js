import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Los precios en Fast-IT están en USD (base mayorista).
// Rates = cuántas unidades de la moneda destino por 1 USD.

const SYMBOLS  = { USD: 'US$', CLP: '$' }
const LOCALES  = { USD: 'en-US', CLP: 'es-CL' }
const DECIMALS = { USD: 2, CLP: 0 }

const FALLBACK_RATES = { USD: 1, CLP: 970 }

export const CURRENCY_LIST = ['USD', 'CLP']

// Formateador fijo en USD — para catálogo/productos (nunca cambia por el selector)
export function formatUSD(amount) {
  return `US$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const useCurrencyStore = create(
  persist(
    (set, get) => ({
      currency:  'USD',
      rates:     FALLBACK_RATES,
      rateMeta:  null,
      fetchedAt: null,

      setCurrency: (currency) => set({ currency }),

      fetchRates: async () => {
        const { fetchedAt } = get()
        if (fetchedAt && Date.now() - fetchedAt < 30 * 60 * 1000) return
        try {
          const res  = await fetch('/api/exchange-rate')
          if (!res.ok) throw new Error('exchange-rate failed')
          const data = await res.json()
          const clp = Number(data?.rate)
          set({
            rates: {
              USD: 1,
              CLP: Number.isFinite(clp) && clp > 0 ? clp : FALLBACK_RATES.CLP,
            },
            rateMeta:  data,
            fetchedAt: Date.now(),
          })
        } catch {
          set({ rates: FALLBACK_RATES, rateMeta: null, fetchedAt: Date.now() })
        }
      },
    }),
    {
      name:       'fastit-currency',
      partialize: (s) => ({ currency: s.currency }),
    }
  )
)

// Hook reactivo — crea un nuevo formatter cada vez que cambian currency o rates,
// garantizando que los componentes se re-rendericen al cambiar moneda.
export function useFormatPrice() {
  const currency = useCurrencyStore(s => s.currency)
  const rates    = useCurrencyStore(s => s.rates)

  return (usdAmount) => {
    const sym   = SYMBOLS[currency]  ?? 'US$'
    const loc   = LOCALES[currency]  ?? 'en-US'
    const decs  = DECIMALS[currency] ?? 2
    const rate  = rates[currency]    ?? 1
    const value = usdAmount * rate
    return `${sym}${value.toLocaleString(loc, {
      minimumFractionDigits: decs,
      maximumFractionDigits: decs,
    })}`
  }
}
