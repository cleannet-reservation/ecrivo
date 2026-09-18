import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [projectsByUser, setProjectsByUser] = useState({});
  const [projectsLoading, setProjectsLoading] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function getToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur de chargement.');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(userId) {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);

    if (!projectsByUser[userId]) {
      setProjectsLoading(userId);
      try {
        const token = await getToken();
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'user-projects', userId }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erreur de chargement des projets.');
        setProjectsByUser((prev) => ({ ...prev, [userId]: result.projects }));
      } catch (err) {
        setProjectsByUser((prev) => ({ ...prev, [userId]: { error: err.message } }));
      } finally {
        setProjectsLoading(null);
      }
    }
  }

  if (loading) return <p className="spinner-text">Chargement…</p>;

  if (error) {
    return (
      <div>
        <h2>Administration</h2>
        <div className="error-box">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h2 style={{ margin: 0 }}>Administration</h2>
        <button className="secondary" onClick={load}>Rafraîchir</button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <p style={{ color: '#9aa0ac', fontSize: 13, margin: '0 0 6px 0' }}>Utilisateurs inscrits</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{data.totalUsers}</p>
        </div>
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <p style={{ color: '#9aa0ac', fontSize: 13, margin: '0 0 6px 0' }}>Clients payants</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#d4a95a' }}>{data.paidCount}</p>
        </div>
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <p style={{ color: '#9aa0ac', fontSize: 13, margin: '0 0 6px 0' }}>Revenu estimé (à 69€)</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{data.paidCount * 69}€</p>
        </div>
      </div>

      <div className="card">
        <p style={{ fontSize: 12.5, color: '#9aa0ac', marginTop: 0 }}>
          Clique sur une ligne pour voir les livres créés par ce compte.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #2a2f3a' }}>
                <th style={{ padding: '8px 10px' }}>Email</th>
                <th style={{ padding: '8px 10px' }}>Inscrit le</th>
                <th style={{ padding: '8px 10px' }}>Statut</th>
                <th style={{ padding: '8px 10px' }}>Clé Anthropic</th>
                <th style={{ padding: '8px 10px' }}>Clé OpenAI</th>
                <th style={{ padding: '8px 10px' }}>Livres créés</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr
                    style={{ borderBottom: '1px solid #2a2f3a', cursor: 'pointer' }}
                    onClick={() => toggleUser(u.id)}
                  >
                    <td style={{ padding: '8px 10px' }}>{u.email}</td>
                    <td style={{ padding: '8px 10px', color: '#9aa0ac' }}>
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`badge ${u.subscription_status === 'active' ? 'done' : ''}`}>
                        {u.subscription_status === 'active' ? 'Payé' : 'Non payé'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>{u.has_anthropic_key ? '✓' : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{u.has_openai_key ? '✓' : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{u.project_count}</td>
                  </tr>
                  {expandedUser === u.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: '4px 10px 16px 10px', background: '#171a21' }}>
                        {projectsLoading === u.id && (
                          <p style={{ color: '#9aa0ac', fontSize: 13 }}>Chargement des projets…</p>
                        )}
                        {projectsByUser[u.id]?.error && (
                          <p style={{ color: '#f0b5b5', fontSize: 13 }}>{projectsByUser[u.id].error}</p>
                        )}
                        {Array.isArray(projectsByUser[u.id]) && projectsByUser[u.id].length === 0 && (
                          <p style={{ color: '#9aa0ac', fontSize: 13 }}>Aucun projet créé pour l'instant.</p>
                        )}
                        {Array.isArray(projectsByUser[u.id]) && projectsByUser[u.id].length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginTop: 8 }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: '#9aa0ac' }}>
                                <th style={{ padding: '4px 8px' }}>Titre</th>
                                <th style={{ padding: '4px 8px' }}>Genre</th>
                                <th style={{ padding: '4px 8px' }}>Type</th>
                                <th style={{ padding: '4px 8px' }}>Statut</th>
                                <th style={{ padding: '4px 8px' }}>Créé le</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectsByUser[u.id].map((p) => (
                                <tr key={p.id}>
                                  <td style={{ padding: '4px 8px' }}>{p.title || 'Sans titre'}</td>
                                  <td style={{ padding: '4px 8px', color: '#9aa0ac' }}>{p.genre}</td>
                                  <td style={{ padding: '4px 8px', color: '#9aa0ac' }}>
                                    {p.book_type === 'carnet' ? 'Carnet' : 'Roman'}
                                  </td>
                                  <td style={{ padding: '4px 8px', color: '#9aa0ac' }}>{p.status}</td>
                                  <td style={{ padding: '4px 8px', color: '#9aa0ac' }}>
                                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
