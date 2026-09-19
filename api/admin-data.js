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

    // Vérifie qui fait la demande, avec la clé anon (juste pour valider le token).
    const supabaseAuth = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
    }

    // Client admin : seul lui peut lire la table admins (RLS bloque tout le reste) et
    // interroger la liste complète des utilisateurs Supabase.
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: adminRow } = await supabaseAdmin
      .from('admins')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!adminRow) {
      return res.status(403).json({ error: "Accès réservé aux administrateurs." });
    }

    const { action, userId, email, note } = req.body;

    if (action === 'user-projects') {
      if (!userId) return res.status(400).json({ error: 'userId manquant.' });

      const { data: userProjects, error: projErr } = await supabaseAdmin
        .from('book_projects')
        .select('id, title, genre, book_type, status, target_pages, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (projErr) throw projErr;

      return res.status(200).json({ projects: userProjects || [] });
    }

    if (action === 'grant-email') {
      if (!email || !email.trim()) return res.status(400).json({ error: 'Email manquant.' });
      const cleanEmail = email.trim().toLowerCase();

      const { error: grantErr } = await supabaseAdmin
        .from('granted_emails')
        .upsert({ email: cleanEmail, note: note || null });
      if (grantErr) throw grantErr;

      // Si la personne a déjà un compte, on lui donne l'accès tout de suite,
      // sans attendre qu'elle se reconnecte.
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const matchedUser = existingUsers?.users.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (matchedUser) {
        await supabaseAdmin.from('subscriptions').upsert({
          user_id: matchedUser.id,
          status: 'active',
          current_period_end: null,
          updated_at: new Date().toISOString(),
        });
        return res.status(200).json({ granted: true, alreadyHadAccount: true });
      }

      return res.status(200).json({ granted: true, alreadyHadAccount: false });
    }

    // Liste de tous les comptes utilisateurs (nécessite la clé service_role)
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersErr) throw usersErr;

    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, status, current_period_end');

    const { data: apiKeys } = await supabaseAdmin
      .from('user_api_keys')
      .select('user_id, anthropic_api_key, openai_api_key');

    const { data: projects } = await supabaseAdmin
      .from('book_projects')
      .select('user_id');

    const subByUser = Object.fromEntries((subscriptions || []).map((s) => [s.user_id, s]));
    const keysByUser = Object.fromEntries((apiKeys || []).map((k) => [k.user_id, k]));
    const projectCountByUser = {};
    (projects || []).forEach((p) => {
      projectCountByUser[p.user_id] = (projectCountByUser[p.user_id] || 0) + 1;
    });

    const users = usersData.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      subscription_status: subByUser[u.id]?.status || null,
      has_anthropic_key: !!keysByUser[u.id]?.anthropic_api_key,
      has_openai_key: !!keysByUser[u.id]?.openai_api_key,
      project_count: projectCountByUser[u.id] || 0,
    }));

    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const paidCount = users.filter((u) => ['active', 'trialing'].includes(u.subscription_status)).length;

    return res.status(200).json({ users, totalUsers: users.length, paidCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
