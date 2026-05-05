import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const existing = get().items.find(i => i.id === product.id)
        if (existing) {
          set({ items: get().items.map(i =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )})
        } else {
          set({ items: [...get().items, { ...product, quantity: 1 }] })
        }
      },

      removeItem: (id) =>
        set({ items: get().items.filter(i => i.id !== id) }),

      updateQty: (id, quantity) => {
        if (quantity < 1) return get().removeItem(id)
        set({ items: get().items.map(i => i.id === id ? { ...i, quantity } : i) })
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.public_price * i.quantity, 0),
      getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'fastit-cart' }
  )
)

export const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,
      token: null,
      // Acepta la respuesta del backend: { access_token, token_type, user }
      login:  ({ access_token, user }) => set({ user, token: access_token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'fastit-auth' }
  )
)
