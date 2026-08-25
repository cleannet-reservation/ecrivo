import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewProject from './pages/NewProject.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';

function Protected({ children }) {
  const { session } = useAuth();
  if (session === undefined) {
    return (
      <div className="center-screen">
        <p className="spinner-text">Chargement…</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
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
      </Routes>
    </AuthProvider>
  );
}
