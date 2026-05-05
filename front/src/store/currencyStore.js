import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Los precios en Fast-IT están en USD (base mayorista).
// Rates = cuántas unidades de la moneda destino por 1 USD.

const SYMBOLS  = { USD: 'US$', CLP: '$', EUR: '€', BRL: 'R$' }
const LOCALES  = { USD: 'en-US', CLP: 'es-CL', EUR: 'de-DE', BRL: 'pt-BR' }
const DECIMALS = { USD: 2, CLP: 0, EUR: 2, BRL: 2 }

// Fallback rates si la API no responde
const FALLBACK_RATES = { USD: 1, CLP: 970, EUR: 0.93, BRL: 5.25 }

export const CURRENCY_LIST = ['USD', 'CLP', 'EUR', 'BRL']

export const useCurrencyStore = create(
  persist(
    (set, get) => ({
      currency:  'USD',
      rates:     FALLBACK_RATES,
      fetchedAt: null,

      setCurrency: (currency) => set({ currency }),

      fetchRates: async () => {
        const { fetchedAt } = get()
        if (fetchedAt && Date.now() - fetchedAt < 30 * 60 * 1000) return
        try {
          const res  = await fetch(
            'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
          )
          const data = await res.json()
          set({
            rates:     { USD: 1, CLP: data.usd.clp, EUR: data.usd.eur, BRL: data.usd.brl },
            fetchedAt: Date.now(),
          })
        } catch {
          set({ rates: FALLBACK_RATES, fetchedAt: Date.now() })
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
