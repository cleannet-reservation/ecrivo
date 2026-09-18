import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

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
                <tr key={u.id} style={{ borderBottom: '1px solid #2a2f3a' }}>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
