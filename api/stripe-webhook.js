import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Nécessaire pour vérifier la signature Stripe : on a besoin du corps brut de la requête,
// pas du JSON déjà parsé.
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Méthode non autorisée');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Client admin : contourne RLS, c'est le SEUL endroit de l'app qui a le droit
  // d'écrire dans la table subscriptions.
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature webhook invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) break;

        // Paiement unique : un paiement réussi donne un accès à vie, pas de renouvellement à suivre.
        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: null,
          status: 'active',
          current_period_end: null, // null = accès à vie, pas de date d'expiration
          updated_at: new Date().toISOString(),
        });
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erreur traitement webhook:', err);
    // On renvoie quand même 200 pour éviter que Stripe ne re-livre en boucle un événement
    // qu'on a déjà reçu mais mal traité côté DB — à surveiller dans les logs Vercel.
    return res.status(200).json({ received: true, warning: err.message });
  }
}
