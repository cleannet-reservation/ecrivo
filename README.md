# Écrivo — Phase 1 (MVP perso)

Générateur de livres (romans/histoires courtes + carnets) pour Amazon KDP.
Flux : idée → plan de chapitres → rédaction chapitre par chapitre → export DOCX.

## Stack
- React + Vite (frontend)
- Vercel (hosting + fonctions API serverless)
- Supabase (auth email/mdp + base de données, avec RLS)
- API Anthropic (Claude Sonnet 5) pour la génération de contenu

## 1. Installer les dépendances

```
npm install
```

## 2. Créer le projet Supabase

1. Va sur https://supabase.com > New Project
2. Une fois créé, va dans **SQL Editor** et colle le contenu de `supabase-schema.sql`, puis exécute.
3. Va dans **Project Settings > API** et récupère :
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
4. Va dans **Authentication > Providers > Email** et vérifie que "Confirm email" est activé ou désactivé selon ta préférence (désactive-le si tu veux tester plus vite en solo).

## 3. Configurer les variables d'environnement en local

Copie `.env.example` vers `.env.local` et remplis :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`ANTHROPIC_API_KEY` n'est utilisée que côté serveur (fonctions `/api`). En local, pour tester les fonctions API, utilise `vercel dev` (voir étape 5) avec un fichier `.env` local, ou déploie directement sur Vercel.

## 4. Lancer en local (frontend seul, sans les fonctions API)

```
npm run dev
```

Pour tester les fonctions `/api/*` en local, il faut utiliser la CLI Vercel :

```
npm install -g vercel
vercel dev
```

## 5. Déployer sur Vercel

1. Pousse ce projet sur un nouveau repo GitHub.
2. Sur https://vercel.com, importe le repo.
3. Dans **Settings > Environment Variables**, ajoute :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (ta clé API Anthropic, créée sur https://console.anthropic.com)
4. Déploie.

## 6. Utilisation

1. Crée un compte via la page de connexion (email/mot de passe).
2. "+ Nouveau livre" → choisis le type (roman ou carnet), le genre, décris ton idée.
3. Génère 4 concepts, choisis-en un → le projet est créé.
4. Sur la page du projet, "Générer le plan de chapitres".
5. Génère chaque chapitre un par un (tu peux éditer ou régénérer chacun).
6. Une fois tous les chapitres rédigés, "Exporter en DOCX" → fichier prêt à uploader sur KDP après relecture.

## Notes techniques
- La clé API Anthropic n'est **jamais** exposée côté client : tous les appels passent par les fonctions `/api/*` sur Vercel.
- RLS Supabase activé : chaque utilisateur ne voit que ses propres projets, prêt pour un passage multi-tenant en Phase 3.
- Le modèle utilisé est `claude-sonnet-5`. Pour changer de modèle, modifie `MODEL` dans `api/_claude.js`.

## Prochaines étapes (Phase 2)
- Génération de la fiche produit Amazon (description, catégories, mots-clés backend)
- Mémoire de "voix"/style pour garder une cohérence entre livres d'une même collection
- Templates de pages répétitives pour les carnets (grilles, lignes, numérotation avancée)
- Export EPUB en plus du DOCX
