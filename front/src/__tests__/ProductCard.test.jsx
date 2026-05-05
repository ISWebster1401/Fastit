import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductCard from '../components/catalog/ProductCard'
import { useCartStore } from '../store/cartStore'

// Producto de prueba
const mockProduct = {
  id: 1,
  sku: 'HPE-P28948-B21',
  name: 'HPE ProLiant DL380 Gen10 Plus',
  brand: 'HPE',
  category: 'servers',
  stock_status: 'available',
  public_price: 6136,
  technical_specs: {
    'Form Factor': '2U Rack',
    'Processor': 'Intel Xeon Silver 4314',
    'Max RAM': '3TB DDR4',
    'Extra Spec': 'No debería mostrarse',
  },
}

const renderCard = (product = mockProduct) =>
  render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>
  )

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('ProductCard — renderizado', () => {
  it('muestra el nombre del producto', () => {
    renderCard()
    expect(screen.getByText('HPE ProLiant DL380 Gen10 Plus')).toBeInTheDocument()
  })

  it('muestra el SKU en formato monospace', () => {
    renderCard()
    expect(screen.getByText('HPE-P28948-B21')).toBeInTheDocument()
  })

  it('muestra la marca', () => {
    renderCard()
    expect(screen.getByText('HPE')).toBeInTheDocument()
  })

  it('muestra el precio formateado', () => {
    renderCard()
    expect(screen.getByText('$6.136')).toBeInTheDocument()
  })

  it('muestra el badge de stock "Disponible"', () => {
    renderCard()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('muestra solo 3 specs técnicas', () => {
    renderCard()
    expect(screen.getByText('Form Factor')).toBeInTheDocument()
    expect(screen.getByText('Processor')).toBeInTheDocument()
    expect(screen.getByText('Max RAM')).toBeInTheDocument()
    expect(screen.queryByText('Extra Spec')).not.toBeInTheDocument()
  })

  it('tiene el link "Ver specs" al detalle del producto', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /ver specs/i })
    expect(link).toHaveAttribute('href', `/product/${mockProduct.sku}`)
  })
})

describe('ProductCard — agregar al carrito', () => {
  it('muestra "Agregar" cuando el producto no está en el carrito', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
  })

  it('agrega el producto al carrito al hacer click', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(mockProduct.id)
  })

  it('muestra "En carrito" después de agregar', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    // Re-render para ver el estado actualizado
    renderCard()
    expect(screen.getAllByText(/en carrito/i).length).toBeGreaterThan(0)
  })
})

describe('ProductCard — producto sin stock', () => {
  const oosProduct = { ...mockProduct, stock_status: 'out_of_stock' }

  it('muestra badge "Sin stock"', () => {
    renderCard(oosProduct)
    expect(screen.getByText('Sin stock')).toBeInTheDocument()
  })

  it('el botón de agregar está deshabilitado', () => {
    renderCard(oosProduct)
    const btn = screen.getByRole('button', { name: /agregar/i })
    expect(btn).toBeDisabled()
  })

  it('no agrega al carrito cuando está sin stock', () => {
    renderCard(oosProduct)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('ProductCard — categorías', () => {
  it('muestra la categoría "Servidores" para servers', () => {
    renderCard({ ...mockProduct, category: 'servers' })
    expect(screen.getByText('Servidores')).toBeInTheDocument()
  })

  it('muestra la categoría "Storage" para storage', () => {
    renderCard({ ...mockProduct, category: 'storage' })
    expect(screen.getByText('Storage')).toBeInTheDocument()
  })

  it('muestra la categoría "Networking" para networking', () => {
    renderCard({ ...mockProduct, category: 'networking' })
    expect(screen.getByText('Networking')).toBeInTheDocument()
  })
})
