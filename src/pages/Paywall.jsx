import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase';

export default function Paywall() {
  const { signOut, refreshSubscription, subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const justPaid = new URLSearchParams(window.location.search).get('checkout') === 'success';

  async function handleSubscribe() {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors de la création du paiement.');
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  }

  return (
    <div className="center-screen">
      <div className="auth-box" style={{ width: 420 }}>
        <h2 style={{ color: '#d4a95a', marginTop: 0 }}>Écrivo</h2>

        {justPaid ? (
          <>
            <p style={{ color: '#9aa0ac', fontSize: 14 }}>
              Paiement reçu ! L'activation de ton compte prend quelques secondes le temps que
              Stripe nous confirme le paiement.
            </p>
            {subscription?.status && (
              <p style={{ fontSize: 13, color: '#9aa0ac' }}>Statut actuel : {subscription.status}</p>
            )}
            <button onClick={handleRefresh} disabled={refreshing} style={{ width: '100%' }}>
              {refreshing ? 'Vérification…' : 'Rafraîchir mon statut'}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: '#9aa0ac', fontSize: 14 }}>
              Abonne-toi pour accéder à Écrivo : génération illimitée d'idées de livres, rédaction
              de chapitres, carnets bas-contenu, couvertures, et export prêt pour Amazon KDP.
            </p>
            {error && <div className="error-box">{error}</div>}
            <button onClick={handleSubscribe} disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Redirection…' : "S'abonner"}
            </button>
          </>
        )}

        <button className="secondary" style={{ width: '100%', marginTop: 8 }} onClick={signOut}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}
