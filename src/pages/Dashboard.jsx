import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [hasKeys, setHasKeys] = useState(null); // null = chargement

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from('book_projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setProjects(data);

    const { data: userData } = await supabase.auth.getUser();
    const { data: keys } = await supabase
      .from('user_api_keys')
      .select('anthropic_api_key')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    setHasKeys(!!keys?.anthropic_api_key);
  }

  const showOnboarding = hasKeys === false || (projects && projects.length === 0);

  return (
    <div>
      <div className="top-bar">
        <h2 style={{ margin: 0 }}>Mes projets</h2>
        <Link to="/new"><button>+ Nouveau livre</button></Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      {projects === null && <p className="spinner-text">Chargement…</p>}

      {projects && showOnboarding && (
        <div className="card" style={{ borderColor: '#3a2f1f' }}>
          <h3 style={{ marginTop: 0 }}>Bienvenue sur Écrivo 👋</h3>
          <p style={{ color: '#9aa0ac', fontSize: 14, marginBottom: 16 }}>
            Deux étapes avant ton premier livre :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{hasKeys ? '✅' : '1️⃣'}</span>
              <span style={{ fontSize: 14, color: hasKeys ? '#9aa0ac' : '#f2ede3' }}>
                Configurer tes clés API Anthropic et OpenAI
              </span>
              {!hasKeys && (
                <Link to="/settings" style={{ marginLeft: 'auto' }}>
                  <button className="secondary" style={{ marginTop: 0, padding: '6px 14px', fontSize: 13 }}>
                    Aller dans Paramètres
                  </button>
                </Link>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{projects.length > 0 ? '✅' : '2️⃣'}</span>
              <span style={{ fontSize: 14, color: projects.length > 0 ? '#9aa0ac' : '#f2ede3' }}>
                Créer ton premier livre
              </span>
              {hasKeys && projects.length === 0 && (
                <Link to="/new" style={{ marginLeft: 'auto' }}>
                  <button className="secondary" style={{ marginTop: 0, padding: '6px 14px', fontSize: 13 }}>
                    Commencer
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {projects && projects.length === 0 && hasKeys !== false && (
        <div className="card">
          <p style={{ color: '#9aa0ac' }}>
            Aucun projet pour l'instant. Lance ton premier livre avec "+ Nouveau livre".
          </p>
        </div>
      )}

      {projects && projects.map((p) => (
        <Link key={p.id} to={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>{p.title || 'Sans titre'}</h3>
                <p style={{ color: '#9aa0ac', margin: 0, fontSize: 13 }}>
                  {p.genre} · {p.book_type === 'carnet' ? 'Carnet' : 'Roman / texte court'}
                </p>
              </div>
              <span className="badge">{p.status}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
