import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function TrialEntry() {
  const { token } = useParams();
  const { session } = useAuth();

  useEffect(() => {
    if (token) {
      localStorage.setItem('ecrivo_trial_token', token);
    }
  }, [token]);

  if (session === undefined) {
    return (
      <div className="center-screen">
        <p className="spinner-text">Chargement…</p>
      </div>
    );
  }

  // Connecté ou pas, on renvoie vers le flux normal — Paywall se charge de réclamer
  // le lien d'essai stocké dès que la personne est authentifiée.
  return <Navigate to={session ? '/' : '/login'} replace />;
}
