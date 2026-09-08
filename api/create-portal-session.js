import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    // Client "au nom de l'utilisateur" (respecte RLS) pour lire sa propre ligne d'abonnement
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
    }

    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userData.user.id)
      .single();

    if (subErr || !sub?.stripe_customer_id) {
      return res.status(404).json({ error: 'Aucun abonnement trouvé pour ce compte.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
