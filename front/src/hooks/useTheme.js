import { useState, useEffect } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('fastit-theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch { return false }
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('fastit-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('fastit-theme', 'light')
    }
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}
