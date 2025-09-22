import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CompanyProvider } from './contexts/CompanyContext'
import { Toaster } from './components/ui/toaster'
import ProtectedRoute from './components/ProtectedRoute'
import Index from './pages/Index'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AcceptInvitation from './pages/AcceptInvitation'
import Dashboard from './pages/Dashboard'
import WorkspaceRouter from './components/WorkspaceRouter'

function App() {
  return (
    <Router>
      <AuthProvider>
        <CompanyProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/:subdomain/*" element={<WorkspaceRouter><div /></WorkspaceRouter>} />
            </Routes>
          </div>
          <Toaster />
        </CompanyProvider>
      </AuthProvider>
    </Router>
  )
}

export default App;
