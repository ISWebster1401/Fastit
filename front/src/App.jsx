import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar            from './components/layout/Navbar'
import Footer            from './components/layout/Footer'
import CatalogPage       from './pages/CatalogPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CheckoutPage      from './pages/CheckoutPage'
import LoginPage         from './pages/LoginPage'
import OrdersPage        from './pages/OrdersPage'
import AdminPage          from './pages/AdminPage'
import AdvisorPage        from './pages/AdvisorPage'
import PaymentResultPage  from './pages/PaymentResultPage'
import VerifyEmailPage    from './pages/VerifyEmailPage'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user)          return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return children
}

function GuestRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"             element={<CatalogPage />} />
          <Route path="/product/:sku" element={<ProductDetailPage />} />
          <Route path="/checkout"     element={<CheckoutPage />} />
          <Route path="/orders"       element={
            <ProtectedRoute><OrdersPage /></ProtectedRoute>
          } />
          <Route path="/admin"        element={
            <AdminRoute><AdminPage /></AdminRoute>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/auth"            element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/advisor"         element={<AdvisorPage />} />
          <Route path="/payment-result"  element={<PaymentResultPage />} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />
          <Route path="/*"       element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
