import { useEffect } from 'react'
import { useCurrencyStore, useFormatPrice } from '../../store/currencyStore'

export default function Price({ amount, className = '' }) {
  const fetchRates = useCurrencyStore(s => s.fetchRates)
  const format     = useFormatPrice()

  useEffect(() => { fetchRates() }, [fetchRates])

  return <span className={className}>{format(amount)}</span>
}
