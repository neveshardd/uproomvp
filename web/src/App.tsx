import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import { APP_CONFIG } from './lib/constants';

// Lazy loading para otimizar performance
const Index = lazy(() => import('./pages/Index'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const CreateCompany = lazy(() => import('./pages/CreateCompany'));
const JoinCompanyByLink = lazy(() => import('./pages/JoinCompanyByLink'));
const AuthClear = lazy(() => import('./pages/AuthClear'));
const WorkspaceRouter = lazy(() => import('./components/WorkspaceRouter'));
const DashboardRouter = lazy(() => import('./components/DashboardRouter'));
const MainDashboardRouter = lazy(() => import('./components/MainDashboardRouter'));

// Componente de loading
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <CompanyProvider>
          <div className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Rotas públicas */}
                <Route path="/" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <WorkspaceRouter><Index /></WorkspaceRouter>
                  </Suspense>
                } />
                <Route path="/login" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Login />
                  </Suspense>
                } />
                <Route path="/register" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Register />
                  </Suspense>
                } />
                <Route path="/auth/callback" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthCallback />
                  </Suspense>
                } />
                <Route path="/forgot-password" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ForgotPassword />
                  </Suspense>
                } />
                <Route path="/reset-password" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ResetPassword />
                  </Suspense>
                } />
                <Route path="/accept-invitation" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AcceptInvitation />
                  </Suspense>
                } />
                <Route path="/auth/clear" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthClear />
                  </Suspense>
                } />
                
                {/* Rotas protegidas */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Profile />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/maindashboard" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <MainDashboardRouter />
                  </Suspense>
                } />
                <Route path="/create-company" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <CreateCompany />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/join-company-by-link" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <JoinCompanyByLink />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <DashboardRouter />
                  </Suspense>
                } />
                
                {/* Rota 404 */}
                <Route path="*" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <WorkspaceRouter>
                      <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                          <p className="text-gray-600 mb-8">Página não encontrada</p>
                          <a href="/" className="text-primary hover:underline">
                            Voltar ao início
                          </a>
                        </div>
                      </div>
                    </WorkspaceRouter>
                  </Suspense>
                } />
              </Routes>
            </Suspense>
            <Toaster />
          </div>
        </CompanyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
