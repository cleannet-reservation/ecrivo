import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewProject from './pages/NewProject.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Paywall from './pages/Paywall.jsx';
import Settings from './pages/Settings.jsx';
import Admin from './pages/Admin.jsx';
import TrialEntry from './pages/TrialEntry.jsx';

function Protected({ children }) {
  const { session, subscription, hasActiveSubscription } = useAuth();

  if (session === undefined || subscription === undefined) {
    return (
      <div className="center-screen">
        <p className="spinner-text">Chargement…</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!hasActiveSubscription) return <Paywall />;
  return children;
}

function Shell({ children }) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand">Écrivo</div>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Mes projets
        </Link>
        <Link to="/new" className={location.pathname === '/new' ? 'active' : ''}>
          + Nouveau livre
        </Link>
        <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
          Paramètres
        </Link>
        <Link
          to="/admin"
          className={location.pathname === '/admin' ? 'active' : ''}
          style={{ fontSize: 12, opacity: 0.6 }}
        >
          Admin
        </Link>
        <div style={{ flex: 1 }} />
        <button className="secondary" onClick={signOut}>
          Déconnexion
        </button>
      </div>
      <div className="main">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/trial/:token" element={<TrialEntry />} />
        <Route
          path="/"
          element={
            <Protected>
              <Shell>
                <Dashboard />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/new"
          element={
            <Protected>
              <Shell>
                <NewProject />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/project/:id"
          element={
            <Protected>
              <Shell>
                <ProjectDetail />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/settings"
          element={
            <Protected>
              <Shell>
                <Settings />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected>
              <Shell>
                <Admin />
              </Shell>
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
