# Phase 3 — Mise en place de l'abonnement Stripe

## 1. Créer le produit et le prix sur Stripe

1. Va sur https://dashboard.stripe.com (crée un compte si besoin)
2. **Reste en mode Test** pour l'instant (interrupteur en haut à droite du dashboard) — tu passeras en mode Live une fois que tout fonctionne
3. Va dans **Produits** → **+ Ajouter un produit**
4. Nom : "Écrivo" (ou ce que tu veux), prix récurrent (ex: 29€/mois), clique "Enregistrer le produit"
5. Une fois créé, clique sur le prix → copie son ID (commence par `price_...`) → c'est ta variable `STRIPE_PRICE_ID`

## 2. Récupérer tes clés API Stripe

1. Va dans **Développeurs** → **Clés API**
2. Copie la **clé secrète** (commence par `sk_test_...` en mode test) → c'est ta variable `STRIPE_SECRET_KEY`
3. **Ne la partage jamais, ne la colle jamais dans un chat** — uniquement dans Vercel

## 3. Configurer le webhook Stripe

Le webhook est ce qui permet à Stripe de dire à ton app "ce client vient de payer, active son compte".

1. Déploie d'abord ton app sur Vercel (voir plus bas) pour avoir une URL de production, par exemple `https://ecrivo.vercel.app`
2. Dans Stripe, va dans **Développeurs** → **Webhooks** → **+ Ajouter un point de terminaison**
3. URL du point de terminaison : `https://TON-URL-VERCEL.vercel.app/api/stripe-webhook`
4. Événements à écouter, sélectionne :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Clique "Ajouter le point de terminaison"
6. Une fois créé, clique dessus → **Signing secret** → révèle et copie (commence par `whsec_...`) → c'est ta variable `STRIPE_WEBHOOK_SECRET`

## 4. Récupérer ta clé service_role Supabase

Cette clé est différente de la clé `anon` utilisée ailleurs — elle contourne les règles de sécurité (RLS), donc elle est **uniquement** utilisée par le webhook Stripe pour activer les comptes, jamais côté client.

1. Supabase → **Settings** → **API**
2. Section "Project API keys" → copie la clé **`service_role`** (PAS la clé `anon`) → c'est ta variable `SUPABASE_SERVICE_ROLE_KEY`
3. ⚠️ Cette clé donne un accès total à ta base de données sans restriction. Ne la mets QUE dans Vercel, jamais dans le code, jamais dans un fichier `VITE_...` (ce préfixe l'exposerait côté client).

## 5. Variables d'environnement à ajouter dans Vercel

En plus de celles déjà en place (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), ajoute :

```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

Puis redéploie (Deployments → 3 points → Redeploy) pour que les nouvelles variables soient prises en compte.

## 6. Base de données

Exécute `migration-phase3a.sql` dans Supabase → SQL Editor (crée la table `subscriptions`).

## 7. Tester en mode Test

Stripe fournit une fausse carte bancaire pour tester sans vrai paiement :
- Numéro : `4242 4242 4242 4242`
- Date : n'importe quelle date future
- CVC : n'importe quel 3 chiffres
- Code postal : n'importe lequel

Crée un compte sur ton app, tu devrais être redirigé vers l'écran "S'abonner", clique dessus, paie avec la carte test, reviens sur l'app, clique "Rafraîchir mon statut" — l'accès devrait se débloquer.

## 8. Passer en mode Live

Une fois que tout fonctionne en mode Test :
1. Bascule l'interrupteur Stripe sur **Live**
2. Refais les étapes 1 à 3 en mode Live (le produit, la clé API, le webhook sont différents entre Test et Live)
3. Remplace les 3 variables Stripe dans Vercel par leurs équivalents `sk_live_...`, `price_...` (live), `whsec_...` (live)
4. Redéploie
