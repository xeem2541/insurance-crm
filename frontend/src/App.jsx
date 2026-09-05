import React, { useContext, Component, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';

// Eager load critical initial pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Lazy load secondary pages on-demand for maximum smoothness & fast initial bundle
const Register = lazy(() => import('./pages/Register'));
const Customers = lazy(() => import('./pages/Customers'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Policies = lazy(() => import('./pages/Policies'));
const Documents = lazy(() => import('./pages/Documents'));
const Reports = lazy(() => import('./pages/Reports'));
const MasterData = lazy(() => import('./pages/MasterData'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const PrintPolicy = lazy(() => import('./pages/PrintPolicy'));
const PrintReceipt = lazy(() => import('./pages/PrintReceipt'));
const Payments = lazy(() => import('./pages/Payments'));
const NonMotorPolicies = lazy(() => import('./pages/NonMotorPolicies'));
const IssuePolicyMotorForm = lazy(() => import('./pages/IssuePolicyMotorForm'));
const IssuePolicyNonMotorForm = lazy(() => import('./pages/IssuePolicyNonMotorForm'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const MobileDashboard = lazy(() => import('./pages/MobileDashboard'));

// Resilient Error Boundary to ensure the web application never crashes to a blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Application ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: "'Sarabun', sans-serif"
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '36px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛡️</div>
            <h3 style={{ fontWeight: '700', marginBottom: '12px', color: '#fbbf24' }}>ระบบกำลังเชื่อมต่อและทำงาน</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              หน้าเว็บเกิดข้อขัดข้องชั่วคราว คุณสามารถรีเฟรชเพื่อโหลดข้อมูลล่าสุดได้ทันที
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                🔄 รีเฟรชหน้าเว็บ
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                🏠 กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        border: '3px solid rgba(251,191,36,0.2)',
        borderTop: '3px solid #fbbf24',
        animation: 'spin 0.9s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ marginTop: '18px', color: '#64748b', fontSize: '0.85rem' }}>กำลังตรวจสอบสิทธิ์...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

// Smooth, non-intrusive page loader for on-demand lazy routes
const PageLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
  }}>
    <div style={{
      position: 'relative',
      width: '44px',
      height: '44px',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: '3px solid rgba(59, 130, 246, 0.15)',
        borderTop: '3px solid #3b82f6',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }} />
      <div style={{
        position: 'absolute',
        top: '6px',
        left: '6px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2px solid rgba(245, 158, 11, 0.2)',
        borderBottom: '2px solid #f59e0b',
        animation: 'spinReverse 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }} />
    </div>
    <p style={{
      marginTop: '16px',
      color: '#94a3b8',
      fontSize: '0.875rem',
      fontWeight: '500',
      letterSpacing: '0.02em',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      กำลังโหลดข้อมูล...
    </p>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes spinReverse { to { transform: rotate(-360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
    `}</style>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    },
  },
});

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="issue-policy-motor" element={<IssuePolicyMotorForm />} />
          <Route path="issue-policy-non-motor" element={<IssuePolicyNonMotorForm />} />
          <Route path="customers" element={<Customers />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="policies" element={<Policies />} />
          <Route path="non-motor" element={<NonMotorPolicies />} />
          <Route path="documents" element={<Documents />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="reports" element={<Reports />} />
          <Route path="master-data" element={<MasterData />} />
          <Route path="payments" element={<Payments />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
        </Route>
        {/* Route for printing without Layout (sidebar/header) */}
        <Route path="/print-policy/:id" element={
          <PrivateRoute>
            <PrintPolicy />
          </PrivateRoute>
        } />
        <Route path="/print-receipt/:id" element={
          <PrivateRoute>
            <PrintReceipt />
          </PrivateRoute>
        } />
        <Route path="/mobile" element={
          <PrivateRoute>
            <MobileDashboard />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              <AppRoutes />
            </Router>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
