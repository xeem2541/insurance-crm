import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
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
import IssuePolicyForm from './pages/IssuePolicyForm';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="issue-policy" element={<IssuePolicyForm />} />
        <Route path="customers" element={<Customers />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="policies" element={<Policies />} />
        <Route path="non-motor" element={<NonMotorPolicies />} />
        <Route path="documents" element={<Documents />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="reports" element={<Reports />} />
        <Route path="master-data" element={<MasterData />} />
        <Route path="payments" element={<Payments />} />
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
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
