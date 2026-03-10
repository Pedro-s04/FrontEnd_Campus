import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute, ToastContainer, setToastCallback } from './components'
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

let toastId = 0

function AppInner() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  useEffect(() => { setToastCallback(addToast) }, [addToast])

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        <Route path="/" element={
          <ProtectedRoute><Navigate to="/tickets" replace /></ProtectedRoute>
        } />

        <Route path="/tickets" element={
          <ProtectedRoute><Layout><Tickets /></Layout></ProtectedRoute>
        } />

        <Route path="/hardware" element={
          <ProtectedRoute><Layout><Hardware /></Layout></ProtectedRoute>
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
          <ProtectedRoute><Layout><Organizacion /></Layout></ProtectedRoute>
        } />

        <Route path="/usuarios" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <Layout><Usuarios /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
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
