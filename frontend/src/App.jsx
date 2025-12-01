import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Backend health check component
const BackendHealthCheck = ({ children }) => {
  const [backendReady, setBackendReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Try to reach backend health endpoint
        const response = await fetch('https://regal-pharma-backend.onrender.com/health', {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          setBackendReady(true);
        } else {
          // Wait and retry (Render cold start)
          setTimeout(checkBackend, 3000);
        }
      } catch (error) {
        console.log('Backend not ready yet, retrying...');
        // Retry after delay
        setTimeout(checkBackend, 3000);
      } finally {
        setChecking(false);
      }
    };

    checkBackend();
  }, []);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h3>Starting Backend Service...</h3>
        <p>This may take 30-60 seconds on first load (Render free tier)</p>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px'
        }}></div>
        <p style={{ color: '#666', fontSize: '14px' }}>
          If this takes too long, refresh the page
        </p>
      </div>
    );
  }

  if (!backendReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h3>Backend Service Unavailable</h3>
        <p>Please check if the backend service is running on Render.</p>
        <a 
          href="https://dashboard.render.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Check Render Dashboard
        </a>
      </div>
    );
  }

  return children;
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
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
        <BackendHealthCheck>
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
              {/* Add a 404 route */}
              <Route path="*" element={
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h2>404 - Page Not Found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                </div>
              } />
            </Route>
          </Routes>
        </BackendHealthCheck>
      </AuthProvider>
    </Router>
  );
}

export default App;