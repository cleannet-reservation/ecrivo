import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Le lien a peut-être expiré, redemande-en un nouveau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="auth-box">
        <h2 style={{ color: '#d4a95a', marginTop: 0 }}>Écrivo</h2>
        {done ? (
          <p style={{ color: '#b5e0b5', fontSize: 14 }}>
            Mot de passe mis à jour. Redirection en cours…
          </p>
        ) : (
          <>
            <p style={{ color: '#9aa0ac', fontSize: 14 }}>Choisis ton nouveau mot de passe.</p>
            <form onSubmit={handleSubmit}>
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <label>Confirme le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
              {error && <div className="error-box">{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
