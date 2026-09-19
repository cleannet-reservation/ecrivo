import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [projectsByUser, setProjectsByUser] = useState({});
  const [projectsLoading, setProjectsLoading] = useState(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');
  const [creatingTrial, setCreatingTrial] = useState(false);
  const [newTrialUrl, setNewTrialUrl] = useState('');
  const [copiedTrial, setCopiedTrial] = useState(false);

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

  async function handleGrantAccess(e) {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGranting(true);
    setGrantMessage('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'grant-email', email: grantEmail, note: grantNote }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur lors de l'octroi de l'accès.");

      setGrantMessage(
        result.alreadyHadAccount
          ? `Accès débloqué immédiatement pour ${grantEmail} (compte déjà existant).`
          : `${grantEmail} aura accès automatiquement dès son inscription.`
      );
      setGrantEmail('');
      setGrantNote('');
      load();
    } catch (err) {
      setGrantMessage(err.message);
    } finally {
      setGranting(false);
    }
  }

  async function handleCreateTrialLink() {
    setCreatingTrial(true);
    setNewTrialUrl('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create-trial-link' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création du lien.');
      setNewTrialUrl(`${window.location.origin}/trial/${result.token}`);
      load();
    } catch (err) {
      setGrantMessage(err.message);
    } finally {
      setCreatingTrial(false);
    }
  }

  function copyTrialUrl() {
    navigator.clipboard.writeText(newTrialUrl);
    setCopiedTrial(true);
    setTimeout(() => setCopiedTrial(false), 1500);
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
        <h3 style={{ marginTop: 0 }}>Offrir un accès</h3>
        <p style={{ fontSize: 13, color: '#9aa0ac' }}>
          Utile pour des bêta-testeurs ou des accès offerts, comme sur BookPro. Si la personne a
          déjà un compte Écrivo, son accès se débloque immédiatement. Sinon, il se débloquera tout
          seul dès qu'elle créera son compte avec cet email.
        </p>
        <form onSubmit={handleGrantAccess} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ marginTop: 0 }}>Email</label>
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="exemple@mail.com"
              required
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ marginTop: 0 }}>Note (optionnel)</label>
            <input
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="ex: bêta-testeur, ami..."
            />
          </div>
          <button type="submit" disabled={granting} style={{ marginTop: 0 }}>
            {granting ? 'Envoi…' : "Offrir l'accès à vie"}
          </button>
        </form>
        {grantMessage && (
          <p style={{ fontSize: 13, color: '#9fd39a', marginTop: 12 }}>{grantMessage}</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lien d'essai (24h)</h3>
        <p style={{ fontSize: 13, color: '#9aa0ac' }}>
          Génère un lien à usage unique. La première personne qui l'ouvre et crée un compte (ou se
          connecte) obtient 24h d'accès complet, sans payer.
        </p>
        <button onClick={handleCreateTrialLink} disabled={creatingTrial}>
          {creatingTrial ? 'Génération…' : "Créer un lien d'essai"}
        </button>

        {newTrialUrl && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input readOnly value={newTrialUrl} style={{ flex: 1, minWidth: 260 }} onFocus={(e) => e.target.select()} />
            <button className="secondary" onClick={copyTrialUrl}>
              {copiedTrial ? 'Copié !' : 'Copier'}
            </button>
          </div>
        )}

        {data.trialLinks && data.trialLinks.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <label style={{ marginTop: 0 }}>Liens créés</label>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#9aa0ac' }}>
                  <th style={{ padding: '4px 8px' }}>Créé le</th>
                  <th style={{ padding: '4px 8px' }}>Statut</th>
                  <th style={{ padding: '4px 8px' }}>Utilisé par</th>
                </tr>
              </thead>
              <tbody>
                {data.trialLinks.map((t) => (
                  <tr key={t.token}>
                    <td style={{ padding: '4px 8px', color: '#9aa0ac' }}>
                      {new Date(t.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <span className={`badge ${t.claimed_by_email ? 'done' : ''}`}>
                        {t.claimed_by_email ? 'Utilisé' : 'Disponible'}
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px', color: '#9aa0ac' }}>{t.claimed_by_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
