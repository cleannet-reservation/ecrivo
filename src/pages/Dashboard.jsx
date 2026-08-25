import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

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
  }

  return (
    <div>
      <div className="top-bar">
        <h2 style={{ margin: 0 }}>Mes projets</h2>
        <Link to="/new"><button>+ Nouveau livre</button></Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      {projects === null && <p className="spinner-text">Chargement…</p>}

      {projects && projects.length === 0 && (
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
