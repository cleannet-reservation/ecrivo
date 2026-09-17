import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase';

// Tarif de lancement — à mettre à jour manuellement le jour où tu changes le prix sur Stripe,
// pour que le message reste cohérent avec ce que le client paie réellement.
const CURRENT_PRICE = '69€';
const NEXT_PRICE = '89€';
const PRICE_INCREASE_DATE = new Date('2026-11-30T00:00:00');

function formatDateFr(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Paywall() {
  const { signOut, refreshSubscription, subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const justPaid = new URLSearchParams(window.location.search).get('checkout') === 'success';
  const priceStillCurrent = new Date() < PRICE_INCREASE_DATE;

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
              Débloque l'accès à vie à Écrivo, en un seul paiement : génération illimitée d'idées
              de livres, rédaction de chapitres, carnets bas-contenu, couvertures, et export prêt
              pour Amazon KDP. Sans abonnement, sans renouvellement.
            </p>

            <div style={{ background: '#1e222b', border: '1px solid #2a2f3a', borderRadius: 8, padding: '14px 16px', margin: '16px 0' }}>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f2ede3' }}>
                {priceStillCurrent ? CURRENT_PRICE : NEXT_PRICE}
                <span style={{ fontSize: 13, fontWeight: 400, color: '#9aa0ac', marginLeft: 8 }}>
                  paiement unique
                </span>
              </p>
              {priceStillCurrent && (
                <p style={{ margin: '6px 0 0 0', fontSize: 12.5, color: '#e0b568' }}>
                  Tarif de lancement — passe à {NEXT_PRICE} le {formatDateFr(PRICE_INCREASE_DATE)}
                </p>
              )}
            </div>

            {error && <div className="error-box">{error}</div>}
            <button onClick={handleSubscribe} disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Redirection…' : "Débloquer l'accès"}
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
