import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

const ACTIVE_STATUSES = ['active', 'trialing'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [subscription, setSubscription] = useState(undefined); // undefined = loading, null = aucune ligne

  const loadSubscription = useCallback(async (currentSession) => {
    if (!currentSession) {
      setSubscription(null);
      return;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', currentSession.user.id)
      .maybeSingle();
    setSubscription(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadSubscription(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadSubscription(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadSubscription]);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signOut = () => supabase.auth.signOut();

  const refreshSubscription = () => loadSubscription(session);

  const hasActiveSubscription = subscription
    ? ACTIVE_STATUSES.includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())
    : false;

  return (
    <AuthContext.Provider
      value={{ session, signIn, signUp, signOut, subscription, hasActiveSubscription, refreshSubscription }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
