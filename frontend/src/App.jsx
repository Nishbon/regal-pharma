import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import MedRepDashboard from './components/MedRepDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import DailyReport from './components/DailyReport';
import ReportsHistory from './components/ReportsHistory';
import PersonalAnalytics from './components/PersonalAnalytics'; // Renamed from Analytics
import TeamAnalytics from './components/TeamAnalytics'; // New component
import Layout from './components/Layout';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// Role-based dashboard component
const RoleBasedDashboard = () => {
  const { user } = useAuth();
  
  if (user?.role === 'supervisor') {
    return <SupervisorDashboard />;
  } else {
    return <MedRepDashboard />;
  }
};

// Role-based analytics component
const RoleBasedAnalytics = () => {
  const { user } = useAuth();
  
  if (user?.role === 'supervisor') {
    return <TeamAnalytics />;
  } else {
    return <PersonalAnalytics />;
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute>
                  <RoleBasedDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="daily-report" 
              element={
                <ProtectedRoute>
                  <DailyReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="reports" 
              element={
                <ProtectedRoute>
                  <ReportsHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="analytics" 
              element={
                <ProtectedRoute>
                  <RoleBasedAnalytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="supervisor" 
              element={
                <ProtectedRoute allowedRoles={['supervisor']}>
                  <SupervisorDashboard />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;