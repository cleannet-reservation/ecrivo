import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import { supabase } from './lib/supabase';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewProject from './pages/NewProject.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Paywall from './pages/Paywall.jsx';
import Settings from './pages/Settings.jsx';

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
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

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
        <div style={{ flex: 1 }} />
        <button className="secondary" onClick={handleManageSubscription} disabled={portalLoading}>
          {portalLoading ? 'Ouverture…' : 'Gérer mon abonnement'}
        </button>
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
      </Routes>
    </AuthProvider>
  );
}
