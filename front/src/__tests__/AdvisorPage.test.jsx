import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdvisorPage from '../pages/AdvisorPage'
import * as clientModule from '../api/client'
import { useCartStore } from '../store/cartStore'

// Mock del módulo api/client
vi.mock('../api/client', () => ({
  advisorChat: vi.fn(),
}))

const renderAdvisor = () =>
  render(
    <MemoryRouter>
      <AdvisorPage />
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  useCartStore.setState({ items: [] })
})

describe('AdvisorPage — selección de categoría', () => {
  it('muestra las 6 cards de use-cases', () => {
    renderAdvisor()
    expect(screen.getByText('Virtualización')).toBeInTheDocument()
    expect(screen.getByText('Base de Datos')).toBeInTheDocument()
    expect(screen.getByText('Storage & Backup')).toBeInTheDocument()
    expect(screen.getByText('IA & Analytics')).toBeInTheDocument()
    expect(screen.getByText('Redes & Seguridad')).toBeInTheDocument()
    expect(screen.getByText('Ya sé qué quiero')).toBeInTheDocument()
  })

  it('muestra el título principal', () => {
    renderAdvisor()
    expect(screen.getByText('¿Qué infraestructura necesitas?')).toBeInTheDocument()
  })

  it('no muestra el chat antes de seleccionar una categoría', () => {
    renderAdvisor()
    expect(screen.queryByPlaceholderText(/escribe tu respuesta/i)).not.toBeInTheDocument()
  })
})

describe('AdvisorPage — flujo de chat', () => {
  it('inicia el chat al seleccionar una categoría', async () => {
    clientModule.advisorChat.mockResolvedValueOnce({
      message: 'Hola, cuéntame sobre tu proyecto de virtualización.',
      recommendation: null,
      escalated: false,
    })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))

    await waitFor(() => {
      expect(clientModule.advisorChat).toHaveBeenCalledTimes(1)
    })
  })

  it('muestra la respuesta del asesor', async () => {
    clientModule.advisorChat.mockResolvedValueOnce({
      message: 'Hola, cuéntame sobre tu proyecto de virtualización.',
      recommendation: null,
      escalated: false,
    })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))

    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument()
    })
  })

  it('muestra el input de chat después de iniciar', async () => {
    clientModule.advisorChat.mockResolvedValueOnce({
      message: 'Primera pregunta.',
      recommendation: null,
      escalated: false,
    })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/escribe tu respuesta/i)).toBeInTheDocument()
    })
  })

  it('muestra "Nueva consulta" para volver', async () => {
    clientModule.advisorChat.mockResolvedValueOnce({
      message: 'Primera pregunta.',
      recommendation: null,
      escalated: false,
    })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))

    await waitFor(() => {
      expect(screen.getByText(/nueva consulta/i)).toBeInTheDocument()
    })
  })

  it('vuelve a la selección al click en "Nueva consulta"', async () => {
    clientModule.advisorChat.mockResolvedValueOnce({
      message: 'Primera pregunta.',
      recommendation: null,
      escalated: false,
    })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))

    await waitFor(() => screen.getByText(/nueva consulta/i))
    fireEvent.click(screen.getByText(/nueva consulta/i))

    expect(screen.getByText('¿Qué infraestructura necesitas?')).toBeInTheDocument()
  })
})

describe('AdvisorPage — recomendación', () => {
  const mockRecommendation = {
    products: [
      {
        id: 1, sku: 'HPE-001', name: 'HPE ProLiant DL380',
        brand: 'HPE', stock: 'available', price_clp: 6136, category: 'servers',
        public_price: 6136,
      },
    ],
    alternative_products: [],
    summary: 'El DL380 es ideal para tu carga de virtualización.',
    justification: 'Soporta hasta 30 VMs con margen de crecimiento.',
    is_overprovisioned: false,
  }

  it('muestra el panel de recomendación cuando la IA responde con productos', async () => {
    clientModule.advisorChat
      .mockResolvedValueOnce({ message: 'Primera pregunta.', recommendation: null, escalated: false })
      .mockResolvedValueOnce({
        message: 'Aquí está mi recomendación:',
        recommendation: mockRecommendation,
        escalated: false,
      })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))
    await waitFor(() => screen.getByPlaceholderText(/escribe tu respuesta/i))

    fireEvent.change(screen.getByPlaceholderText(/escribe tu respuesta/i), {
      target: { value: 'Necesito 15 VMs para producción' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' })) // Send button

    await waitFor(() => {
      expect(screen.getByText('HPE ProLiant DL380')).toBeInTheDocument()
    })
  })

  it('muestra el botón "Agregar todo al carrito"', async () => {
    clientModule.advisorChat
      .mockResolvedValueOnce({ message: 'Primera pregunta.', recommendation: null, escalated: false })
      .mockResolvedValueOnce({
        message: 'Recomendación lista:',
        recommendation: mockRecommendation,
        escalated: false,
      })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))
    await waitFor(() => screen.getByPlaceholderText(/escribe tu respuesta/i))

    fireEvent.change(screen.getByPlaceholderText(/escribe tu respuesta/i), {
      target: { value: 'Respuesta' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => {
      expect(screen.getByText(/agregar todo al carrito/i)).toBeInTheDocument()
    })
  })
})

describe('AdvisorPage — error de API', () => {
  it('muestra mensaje de error si la API key no está configurada (503)', async () => {
    clientModule.advisorChat.mockRejectedValueOnce({
      response: { status: 503 },
    })

    renderAdvisor()
    fireEvent.click(screen.getByText('Virtualización'))

    await waitFor(() => {
      expect(screen.getByText(/OPENAI_API_KEY/i)).toBeInTheDocument()
    })
  })
})
