import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { clearApiKeysCache } from '../lib/apiClient';

export default function Settings() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (data) {
      setAnthropicKey(data.anthropic_api_key || '');
      setOpenaiKey(data.openai_api_key || '');
    }
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error: upsertErr } = await supabase.from('user_api_keys').upsert({
        user_id: userData.user.id,
        anthropic_api_key: anthropicKey.trim(),
        openai_api_key: openaiKey.trim(),
        updated_at: new Date().toISOString(),
      });
      if (upsertErr) throw upsertErr;
      clearApiKeysCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="spinner-text">Chargement…</p>;

  return (
    <div>
      <h2>Paramètres — Clés API</h2>
      <div className="card">
        <p style={{ color: '#9aa0ac', fontSize: 14 }}>
          Écrivo utilise <strong>tes propres clés API</strong> : chaque génération (texte, couverture)
          est facturée directement par Anthropic et OpenAI sur ton compte, pas par Écrivo. Tes clés
          restent privées — seul toi peux les voir ou les modifier.
        </p>

        <form onSubmit={handleSave}>
          <label style={{ marginTop: 0 }}>
            Clé API Anthropic (pour la génération de texte — idées, plans, chapitres, styles)
          </label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
          <p style={{ fontSize: 12, color: '#9aa0ac', marginTop: 4 }}>
            Crée-la sur{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: '#d4a95a' }}>
              console.anthropic.com/settings/keys
            </a>{' '}
            (ajoute du crédit dans Billing pour qu'elle fonctionne).
          </p>

          <label>Clé API OpenAI (pour la génération des couvertures)</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-proj-..."
            autoComplete="off"
          />
          <p style={{ fontSize: 12, color: '#9aa0ac', marginTop: 4 }}>
            Crée-la sur{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: '#d4a95a' }}>
              platform.openai.com/api-keys
            </a>{' '}
            (ajoute du crédit dans Settings &gt; Billing). Optionnelle si tu ne génères pas de couvertures.
          </p>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer mes clés'}
          </button>
        </form>
      </div>
    </div>
  );
}
