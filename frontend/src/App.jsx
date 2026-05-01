import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TeamDetail from './pages/TeamDetail';

import { LogOut, Clock } from 'lucide-react';

const PendingApproval = () => {
  const { logout } = useAuth();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
        <Clock size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ marginBottom: '8px' }}>Access Pending</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Your request to join this organization is pending approval from the Super Admin or Team Admin.
        </p>
        <button onClick={logout} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
};

const PrivateRoute = ({ children }) => {
  const { user, userProfile } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (userProfile?.status === 'pending') return <PendingApproval />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/team/:id" 
            element={
              <PrivateRoute>
                <TeamDetail />
              </PrivateRoute>
            } 
          />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
