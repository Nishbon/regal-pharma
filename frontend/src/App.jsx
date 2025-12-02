import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import MedRepDashboard from './components/MedRepDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import DailyReport from './components/DailyReport';
import ReportsHistory from './components/ReportsHistory';
import PersonalAnalytics from './components/PersonalAnalytics';
import TeamAnalytics from './components/TeamAnalytics';
import Layout from './components/Layout';

// Loading component for better UX
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    gap: '20px'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      border: '5px solid #f3f3f3',
      borderTop: '5px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p>Loading application...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    console.log('🔒 ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" />;
  }

  console.log('👤 ProtectedRoute - User role:', user.role);
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log(`🚫 ProtectedRoute: Role ${user.role} not allowed, redirecting`);
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// Role-based dashboard component
const RoleBasedDashboard = () => {
  const { user } = useAuth();
  
  console.log('🎯 RoleBasedDashboard - User role:', user?.role);
  
  if (user?.role === 'supervisor' || user?.role === 'admin') {
    console.log('➡️ Redirecting to SupervisorDashboard');
    return <Navigate to="/supervisor-dashboard" replace />;
  } else {
    console.log('➡️ Staying on MedRepDashboard');
    return <MedRepDashboard />;
  }
};

// Role-based analytics component
const RoleBasedAnalytics = () => {
  const { user } = useAuth();
  
  console.log('📊 RoleBasedAnalytics - User role:', user?.role);
  
  if (user?.role === 'supervisor' || user?.role === 'admin') {
    return <TeamAnalytics />;
  } else {
    return <PersonalAnalytics />;
  }
};

// Supervisor Dashboard Route
const SupervisorDashboardRoute = () => {
  const { user } = useAuth();
  
  console.log('👨‍💼 SupervisorDashboardRoute - User role:', user?.role);
  
  if (user?.role === 'supervisor' || user?.role === 'admin') {
    return <SupervisorDashboard />;
  } else {
    console.log('🚫 Access denied to supervisor dashboard, redirecting');
    return <Navigate to="/dashboard" replace />;
  }
};

// Wrapper component to handle post-login redirects
const AppContent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      // Check if we have a stored redirect path from login
      const redirectPath = sessionStorage.getItem('postLoginRedirect');
      
      if (redirectPath) {
        console.log('🔄 Found post-login redirect path:', redirectPath);
        // Clear the stored path
        sessionStorage.removeItem('postLoginRedirect');
        // Navigate to the intended destination
        navigate(redirectPath);
      }
    }
  }, [user, loading, navigate]);

  // Show loading while auth initializes
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" />} />
        
        {/* MAIN DASHBOARD - Auto-detects role */}
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute>
              <RoleBasedDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* SUPERVISOR DASHBOARD - Only for supervisors/admins */}
        <Route 
          path="supervisor-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
              <SupervisorDashboardRoute />
            </ProtectedRoute>
          } 
        />
        
        {/* DAILY REPORT - For all authenticated users */}
        <Route 
          path="daily-report" 
          element={
            <ProtectedRoute>
              <DailyReport />
            </ProtectedRoute>
          } 
        />
        
        {/* REPORTS HISTORY - For all authenticated users */}
        <Route 
          path="reports" 
          element={
            <ProtectedRoute>
              <ReportsHistory />
            </ProtectedRoute>
          } 
        />
        
        {/* ANALYTICS - Role-based */}
        <Route 
          path="analytics" 
          element={
            <ProtectedRoute>
              <RoleBasedAnalytics />
            </ProtectedRoute>
          } 
        />
        
        {/* Add a 404 route */}
        <Route path="*" element={
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>404 - Page Not Found</h2>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/dashboard">Go to Dashboard</a>
          </div>
        } />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
