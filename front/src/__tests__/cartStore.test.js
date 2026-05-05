import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore, useAuthStore } from '../store/cartStore'

// Productos de prueba
const productA = { id: 1, sku: 'HPE-001', name: 'Servidor HPE', public_price: 5900, category: 'servers', stock_status: 'available' }
const productB = { id: 2, sku: 'NET-001', name: 'Switch Cisco', public_price: 4920, category: 'networking', stock_status: 'available' }

// Reset del store antes de cada test
beforeEach(() => {
  useCartStore.setState({ items: [] })
  useAuthStore.setState({ user: null, token: null })
})

// ─── Cart Store ───────────────────────────────────────────────────────────────

describe('CartStore — addItem', () => {
  it('agrega un producto nuevo', () => {
    useCartStore.getState().addItem(productA)
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(1)
    expect(items[0].quantity).toBe(1)
  })

  it('incrementa la cantidad si el producto ya está en el carrito', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().addItem(productA)
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('agrega múltiples productos distintos', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().addItem(productB)
    expect(useCartStore.getState().items).toHaveLength(2)
  })
})

describe('CartStore — removeItem', () => {
  it('elimina un producto del carrito', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().addItem(productB)
    useCartStore.getState().removeItem(productA.id)
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(productB.id)
  })

  it('no falla si el producto no existe', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().removeItem(9999)
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})

describe('CartStore — updateQty', () => {
  it('actualiza la cantidad de un producto', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().updateQty(productA.id, 5)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('elimina el producto si la cantidad es 0', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().updateQty(productA.id, 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('elimina el producto si la cantidad es negativa', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().updateQty(productA.id, -1)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('CartStore — clearCart', () => {
  it('vacía el carrito completamente', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().addItem(productB)
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('CartStore — getTotal', () => {
  it('calcula el total correctamente', () => {
    useCartStore.getState().addItem(productA)     // 5900 × 1
    useCartStore.getState().addItem(productB)     // 4920 × 1
    useCartStore.getState().addItem(productA)     // 5900 × 2 al final
    const total = useCartStore.getState().getTotal()
    // productA qty=2: 5900*2=11800, productB qty=1: 4920 → total=16720
    expect(total).toBe(16720)
  })

  it('retorna 0 con carrito vacío', () => {
    expect(useCartStore.getState().getTotal()).toBe(0)
  })
})

describe('CartStore — getCount', () => {
  it('cuenta el total de unidades', () => {
    useCartStore.getState().addItem(productA)
    useCartStore.getState().addItem(productA)
    useCartStore.getState().addItem(productB)
    expect(useCartStore.getState().getCount()).toBe(3)
  })

  it('retorna 0 con carrito vacío', () => {
    expect(useCartStore.getState().getCount()).toBe(0)
  })
})

// ─── Auth Store ───────────────────────────────────────────────────────────────

describe('AuthStore — login', () => {
  it('guarda el usuario y el token', () => {
    const session = {
      access_token: 'eyJtest',
      user: { id: 1, email: 'seb@fastit.cl', is_admin: true, is_company: false },
    }
    useAuthStore.getState().login(session)
    const { user, token } = useAuthStore.getState()
    expect(user.email).toBe('seb@fastit.cl')
    expect(user.is_admin).toBe(true)
    expect(token).toBe('eyJtest')
  })
})

describe('AuthStore — logout', () => {
  it('limpia usuario y token', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'test@test.cl' },
      token: 'some_token',
    })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
