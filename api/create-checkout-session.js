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

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
    }
    const user = userData.user;

    // Vérifie discrètement si cette personne a reçu un accès offert (par email) avant de
    // proposer le paiement — si oui, on débloque directement sans passer par Stripe.
    if (req.body.action === 'claim') {
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: grant } = await supabaseAdmin
        .from('granted_emails')
        .select('email')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (!grant) {
        return res.status(200).json({ granted: false });
      }

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        status: 'active',
        current_period_end: null,
        updated_at: new Date().toISOString(),
      });
      await supabaseAdmin.from('granted_emails').delete().eq('email', user.email.toLowerCase());

      return res.status(200).json({ granted: true });
    }

    // Réclame un lien d'essai de 24h (créé depuis l'admin) — utilisable une seule fois.
    if (req.body.action === 'claim-trial') {
      const { trialToken } = req.body;
      if (!trialToken) return res.status(400).json({ error: 'trialToken manquant.' });

      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: link } = await supabaseAdmin
        .from('trial_links')
        .select('token, claimed_by')
        .eq('token', trialToken)
        .maybeSingle();

      if (!link) {
        return res.status(200).json({ granted: false, reason: 'invalid' });
      }
      if (link.claimed_by) {
        return res.status(200).json({ granted: false, reason: 'already_used' });
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        status: 'trialing',
        current_period_end: expiresAt,
        updated_at: new Date().toISOString(),
      });

      await supabaseAdmin
        .from('trial_links')
        .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
        .eq('token', trialToken);

      return res.status(200).json({ granted: true, expiresAt });
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({
        error:
          "Stripe n'est pas configuré côté serveur (STRIPE_SECRET_KEY / STRIPE_PRICE_ID manquants dans Vercel).",
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      invoice_creation: { enabled: true }, // pour que le client ait une facture téléchargeable
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
