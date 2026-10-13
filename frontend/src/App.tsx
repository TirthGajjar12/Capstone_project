import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import TicketList from './components/tickets/TicketList';
import TicketForm from './components/tickets/TicketForm';
import AssetList from './components/assets/AssetList';
import AssetForm from './components/assets/AssetForm';
import './styles.css';

/* Lazy-loaded page components */
// @ts-ignore
const LoginPage = lazy(() => import('./pages/Login'));
// @ts-ignore
const SignupPage = lazy(() => import('./pages/Signup'));
// @ts-ignore
const HomePage = lazy(() => import('./pages/Home'));

/** Suspense wrapper with a centered spinner. */
function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="spinner" />
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/** Route guard: only lets authenticated users enter dashboard/workspace pages */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        Checking session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<PageLoader><LoginPage /></PageLoader>} />
          <Route path="/signup" element={<PageLoader><SignupPage /></PageLoader>} />
          <Route path="/register" element={<PageLoader><SignupPage /></PageLoader>} />

          {/* Protected Main Application Shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/create" element={<TicketForm />} />
            <Route path="/assets" element={<AssetList />} />
            <Route path="/assets/create" element={<AssetForm />} />
            <Route path="/home" element={<PageLoader><HomePage /></PageLoader>} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;