import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useRef, useState } from 'react';
import { ProtectedRoute } from './components/Router';
import { GlobalDataProvider } from './context/GlobalDataProvider';
import WelcomeScreen from './components/WelcomeScreen';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoadingPage } from './components/ui/loading-spinner';
import { Toaster } from './components/ui/sonner';
import Dashboard from './components/Dashboard';
import { useAuth } from './context/AuthContext';
import Profile from './components/Profile';
import Settings from './components/Settings';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Label } from './components/ui/label';
import { Eye, EyeOff, User } from 'lucide-react';
import { Input } from './components/ui/input';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import { toast } from 'sonner';
import Logo from './assets/images/smart-sb.png';
import UserManagement from './components/UserManagement';
import AuditTrailManagement from './components/AuditTrailManagement';
import CommunicationManagement from './components/CommunicationManagement';

// Unauthorized page component
function UnauthorizedPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="space-y-6 text-center">
        <div className="text-8xl">🚫</div>
        <h2 className="font-bold text-3xl">Access Denied</h2>
        <p className="text-muted-foreground text-xl">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  );
}

// Not found page component
function NotFoundPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="space-y-6 text-center">
        <div className="text-8xl">🚧</div>
        <h2 className="font-bold text-3xl">Page Not Found</h2>
        <p className="text-muted-foreground text-xl">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}

// Layout wrapper for authenticated routes
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPage = location.pathname.split('/').pop() || 'dashboard';
  
  return (
    <DashboardLayout currentPage={currentPage}>
      <Suspense fallback={<LoadingPage text="Loading page..." />}>
        {children}
      </Suspense>
    </DashboardLayout>
  );
}

function AppRoutes() {
  const { user, isLoading, showAuth, setShowAuth, login, loginData, setLoginData } = useAuth();
  const [error, setError] = useState('');
  const userIdInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const navigate = useNavigate(); // ← added

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    
    try {
      await login(loginData.user_id, loginData.password);
      navigate('/admin/dashboard', { replace: true }); // ← always redirect to dashboard after login
    } catch(err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message || 'An unknown login error occurred.';
      toast.error(errorMessage);
      setLoginData(prev => ({ ...prev, password: '' }));
    } finally {
      setFormLoading(false);
    }
  }

  if (isLoading && !showAuth) {
    return <LoadingPage text="Checking authentication..." />;
  }

  if (showAuth) {
    return (
      <div className="flex justify-center items-center bg-gradient-to-br from-[#008ea2] to-[#007a8b] p-4 sm:p-6 min-h-screen">
        <div className="flex flex-col space-y-4 w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-bold text-white text-3xl">SMART-SB</h1>
            <p className="text-blue-100 text-lg">Sangguniang Bayan ng Santa Cruz, Davao del Sur</p>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, x: 0, y: 0 }}
            transition={{ duration: 0.25, delay: 0, type: "spring" }}
          >
            <Card className="relative bg-white/95 shadow-2xl backdrop-blur-sm">
              <CardHeader className="space-y-2 pb-4">
                <div className="flex justify-center items-center gap-3">
                  <img src={Logo} className="shadow-sm rounded-full w-24 h-24 max-h-24" alt="SMART-SB Logo" />
                </div>
                <CardTitle className="font-bold text-gray-800 text-2xl text-center sm:text-start">Welcome Back</CardTitle>
                <CardDescription className="text-gray-600 text-base text-center sm:text-start">
                  Sign in to access the e-legislative management portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userid" className="font-medium text-gray-700">User ID</Label>
                    <div className="relative">
                      <User className="top-3 left-3 absolute w-5 h-5 text-gray-400" />
                      <Input
                        ref={userIdInputRef}
                        id="userid"
                        type="text"
                        placeholder="Enter your User ID"
                        className="pl-10 border-gray-300 focus:border-[#008ea2] focus:ring-[#008ea2] h-11"
                        value={loginData.user_id}
                        onChange={(e) => setLoginData(prev => ({ ...prev, user_id: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-medium text-gray-700">Password</Label>
                    <div className="relative">
                      <div className="top-3 left-3 absolute w-5 h-5 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <Input
                        ref={passwordInputRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 border-gray-300 focus:border-[#008ea2] focus:ring-[#008ea2] h-11"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="top-3 right-3 absolute text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                      <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit"
                    className="bg-[#008ea2] hover:bg-[#2d6fd9] shadow-md !my-4 w-full h-11 font-semibold text-white text-base hover:scale-[1.02] transition-all" 
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <div className="flex items-center">
                        <span className="mr-2 border-2 border-white/30 border-t-white rounded-full w-4 h-4 animate-spin"></span>
                        Signing in...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAuth(false)}
                className="px-4 py-2 text-blue-100 hover:text-white text-base transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // If not authenticated, show public routes only
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/login" element={<WelcomeScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Authenticated routes — public pages redirect to dashboard
  return (
    <AuthenticatedLayout>
      <Routes>
        {/* Root and public pages → redirect to dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member', 'Staff', 'Tracker', 'Uploader']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Users */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member', 'Staff', 'Tracker', 'Uploader']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Communications */}
        <Route
          path="/admin/communications"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member', 'Staff', 'Tracker', 'Uploader']}>
              <CommunicationManagement />
            </ProtectedRoute>
          }
        />

        {/* Audit Trail */}
        <Route
          path="/admin/audit-trail"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member', 'Staff', 'Tracker', 'Uploader']}>
              <AuditTrailManagement />
            </ProtectedRoute>
          }
        />

        {/* Profile & Settings */}
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member', 'Staff', 'Tracker', 'Uploader']}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Error pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthenticatedLayout>
  );
}

export default function App() {
  return (
    <>
      <GlobalDataProvider>
        <AppRoutes />
      </GlobalDataProvider>
      <Toaster />
    </>
  );
}