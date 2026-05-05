import axios from 'axios'
import { useAuthStore } from '../store/cartStore'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró en una ruta protegida, limpia sesión y redirige
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url ?? ''
    if (err.response?.status === 401 && !url.includes('/auth/')) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const getProducts       = (filters = {}) =>
  api.get('/products', { params: filters }).then(r => r.data)

export const getProduct        = (sku) =>
  api.get(`/products/${sku}`).then(r => r.data)

export const checkout          = (payload) =>
  api.post('/checkout', payload).then(r => r.data)

export const login             = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

export const register          = (payload) =>
  api.post('/auth/register', payload).then(r => r.data)

export const getUserOrders     = () =>
  api.get('/orders').then(r => r.data)

export const getOrder          = (orderId) =>
  api.get(`/orders/${orderId}`).then(r => r.data)

export const createPayment     = (orderId) =>
  api.post('/payments/create', { order_id: orderId }).then(r => r.data)

export const createFlowPayment = (orderId) =>
  api.post('/flow/create', { order_id: orderId }).then(r => r.data)

export const adminGetTimeline   = (days = 30) =>
  api.get('/admin/stats/timeline', { params: { days } }).then(r => r.data)

export const adminGetUsers      = () =>
  api.get('/admin/users').then(r => r.data)

export const adminDeleteUser    = (userId) =>
  api.delete(`/admin/users/${userId}`).then(r => r.data)

export const adminToggleActive  = (userId) =>
  api.patch(`/admin/users/${userId}/toggle-active`).then(r => r.data)

export const verifyEmail        = (token) =>
  api.get('/auth/verify-email', { params: { token } }).then(r => r.data)

export const resendVerification = () =>
  api.post('/auth/resend-verification').then(r => r.data)

export const advisorChat = (category, messages) =>
  api.post('/advisor/chat', { category, messages }).then(r => r.data)

export const advisorNextQuestion = (category, answers) =>
  api.post('/advisor/question', { category, answers }).then(r => r.data)

export const adminGetOrders    = () =>
  api.get('/admin/orders').then(r => r.data)

export const adminGetStats     = () =>
  api.get('/admin/stats').then(r => r.data)

export const adminUpdateStatus = (orderId, status) =>
  api.patch(`/admin/orders/${orderId}/status`, { status }).then(r => r.data)

// ─── Admin Products ───────────────────────────────────────────────────────────

export const adminGetProducts = () =>
  api.get('/admin/products').then(r => r.data)

export const adminDeleteProduct = (productId) =>
  api.delete(`/admin/products/${productId}`).then(r => r.data)

export const adminImportPreview = (formData) =>
  api.post('/admin/products/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const adminImportConfirm = (payload) =>
  api.post('/admin/products/import/confirm', payload).then(r => r.data)

export default api
