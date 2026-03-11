import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute } from './components'
import Layout from './components/Layout'
import Login       from './pages/Login'
import Dashboard   from './pages/Dashboard'
import Tickets     from './pages/Tickets'
import Hardware    from './pages/Hardware'
import Software    from './pages/Software'
import Contratos   from './pages/Contratos'
import Organizacion from './pages/Organizacion'
import Usuarios    from './pages/Usuarios'
import NotFound    from './pages/NotFound'

function AppInner() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        <Route path="/" element={
          <ProtectedRoute><Navigate to="/tickets" replace /></ProtectedRoute>
        } />

        <Route path="/tickets" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR', 'TECNICO']}><Layout><Tickets /></Layout></ProtectedRoute>
        } />

        <Route path="/hardware" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}><Layout><Hardware /></Layout></ProtectedRoute>
        } />

        <Route path="/software" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}>
            <Layout><Software /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/contratos" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}>
            <Layout><Contratos /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/organizacion" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}><Layout><Organizacion /></Layout></ProtectedRoute>
        } />

        <Route path="/usuarios" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <Layout><Usuarios /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR', 'TECNICO']}>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
