import { useMemo } from 'react'
import { useAuthStore } from '../store/cartStore'
import * as authApi from '../lib/auth'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const persistLogin = useAuthStore(s => s.login)
  const persistLogout = useAuthStore(s => s.logout)

  const value = useMemo(() => ({
    user,
    isLoading: false,
    login: async (credentials) => {
      const session = await authApi.login(credentials)
      persistLogin(session)
      return session
    },
    register: async (payload) => {
      const session = await authApi.register(payload)
      persistLogin(session)
      return session
    },
    logout: () => {
      authApi.logout()
      persistLogout()
    },
    token,
  }), [persistLogin, persistLogout, token, user])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
