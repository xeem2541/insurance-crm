import React, { useContext, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Vehicles from './pages/Vehicles';
import Policies from './pages/Policies';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import MasterData from './pages/MasterData';
import CalendarView from './pages/CalendarView';
import PrintPolicy from './pages/PrintPolicy';
import PrintReceipt from './pages/PrintReceipt';
import Payments from './pages/Payments';
import NonMotorPolicies from './pages/NonMotorPolicies';
import IssuePolicyMotorForm from './pages/IssuePolicyMotorForm';
import IssuePolicyNonMotorForm from './pages/IssuePolicyNonMotorForm';
import ActivityLogs from './pages/ActivityLogs';
import MobileDashboard from './pages/MobileDashboard';

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
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
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
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
