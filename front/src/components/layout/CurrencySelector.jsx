import { useEffect } from 'react'
import { useCurrencyStore, CURRENCY_LIST } from '../../store/currencyStore'
// CurrencySelector sólo necesita currency + setCurrency para el ciclo

export default function CurrencySelector() {
  const currency   = useCurrencyStore(s => s.currency)
  const setCurrency = useCurrencyStore(s => s.setCurrency)
  const fetchRates  = useCurrencyStore(s => s.fetchRates)

  useEffect(() => { fetchRates() }, [fetchRates])

  const cycle = () => {
    const idx = CURRENCY_LIST.indexOf(currency)
    setCurrency(CURRENCY_LIST[(idx + 1) % CURRENCY_LIST.length])
  }

  return (
    <button
      onClick={cycle}
      title="Cambiar moneda"
      className="h-8 px-2.5 rounded-full text-xs font-semibold tracking-wider
                 text-[#374151] dark:text-white/80 border border-[#d1d5db] dark:border-white/25
                 hover:border-[#1e40af] hover:text-[#1e40af] dark:hover:border-blue-400 dark:hover:text-blue-300
                 hover:bg-[#f1f5f9] dark:hover:bg-white/[0.08]
                 transition-all duration-200 select-none"
    >
      {currency}
    </button>
  )
}
