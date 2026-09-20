import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setInfo('Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo('Si ce compte existe, un email avec un lien de réinitialisation vient de partir.');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="auth-box">
        <h2 style={{ color: '#d4a95a', marginTop: 0 }}>Écrivo</h2>
        <p style={{ color: '#9aa0ac', fontSize: 14 }}>
          {mode === 'signin' && 'Connecte-toi à ton espace.'}
          {mode === 'signup' && 'Crée ton compte.'}
          {mode === 'forgot' && 'Réinitialise ton mot de passe.'}
        </p>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== 'forgot' && (
            <>
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </>
          )}
          {error && <div className="error-box">{error}</div>}
          {info && <div className="error-box" style={{ background: '#1f3a24', borderColor: '#3a5a3a', color: '#b5e0b5' }}>{info}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading
              ? 'Patiente…'
              : mode === 'signin'
              ? 'Se connecter'
              : mode === 'signup'
              ? "S'inscrire"
              : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>

        {mode === 'signin' && (
          <button
            className="secondary"
            style={{ width: '100%', marginTop: 8, fontSize: 13 }}
            onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
          >
            Mot de passe oublié ?
          </button>
        )}

        <button
          className="secondary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
            setInfo('');
          }}
        >
          {mode === 'signup' ? 'Déjà un compte ? Se connecter' : mode === 'forgot' ? 'Retour à la connexion' : "Pas de compte ? S'inscrire"}
        </button>
      </div>
    </div>
  );
}
