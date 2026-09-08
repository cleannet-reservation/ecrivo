import { supabase } from './supabase';

let cachedKeys = null;

export function clearApiKeysCache() {
  cachedKeys = null;
}

export async function getApiKeys(forceRefresh = false) {
  if (cachedKeys && !forceRefresh) return cachedKeys;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { anthropic_api_key: '', openai_api_key: '' };
  }

  const { data } = await supabase
    .from('user_api_keys')
    .select('anthropic_api_key, openai_api_key')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  cachedKeys = data || { anthropic_api_key: '', openai_api_key: '' };
  return cachedKeys;
}

// Remplace les appels fetch('/api/...') directs : injecte automatiquement les clés
// personnelles de l'utilisateur dans chaque requête, pour qu'Écrivo n'ait jamais à
// payer lui-même les appels IA.
export async function callApi(endpoint, body = {}) {
  const keys = await getApiKeys();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      anthropicApiKey: keys.anthropic_api_key || '',
      openaiApiKey: keys.openai_api_key || '',
    }),
  });

  return res;
}
