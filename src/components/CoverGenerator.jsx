import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function CoverGenerator({ project, chapters = [], onUpdate }) {
  const [prompt, setPrompt] = useState(project.cover_prompt || '');
  const [promptLoading, setPromptLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');

  const [backCoverText, setBackCoverText] = useState(project.back_cover_text || '');
  const [backCoverLoading, setBackCoverLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSuggestPrompt() {
    setPromptLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-cover-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          genre: project.genre,
          pitch: project.concept?.pitch || '',
          bookType: project.book_type,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors de la suggestion de prompt.');
      }
      const data = await res.json();
      setPrompt(data.prompt);
    } catch (err) {
      setError(err.message);
    } finally {
      setPromptLoading(false);
    }
  }

  async function handleGenerateImage() {
    if (!prompt.trim()) {
      setError('Écris ou génère un prompt avant de lancer la génération.');
      return;
    }
    setImageLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur lors de la génération de l'image.");
      }
      const data = await res.json();
      const dataUrl = `data:image/png;base64,${data.image_base64}`;

      const { error: updateErr } = await supabase
        .from('book_projects')
        .update({ cover_image_url: dataUrl, cover_prompt: prompt })
        .eq('id', project.id);
      if (updateErr) throw updateErr;

      onUpdate({ ...project, cover_image_url: dataUrl, cover_prompt: prompt });
    } catch (err) {
      setError(err.message);
    } finally {
      setImageLoading(false);
    }
  }

  async function handleGenerateBackCover() {
    setBackCoverLoading(true);
    setError('');
    try {
      const chapterSummaries = chapters.map((c) => `${c.title}: ${c.summary}`).join('\n');

      const res = await fetch('/api/generate-back-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          genre: project.genre,
          bookType: project.book_type,
          pitch: project.concept?.pitch || '',
          targetAudience: project.concept?.target_audience || '',
          chapterSummaries,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors de la génération de la 4e de couverture.');
      }
      const data = await res.json();

      const { error: updateErr } = await supabase
        .from('book_projects')
        .update({ back_cover_text: data.back_cover_text })
        .eq('id', project.id);
      if (updateErr) throw updateErr;

      setBackCoverText(data.back_cover_text);
      onUpdate({ ...project, back_cover_text: data.back_cover_text });
    } catch (err) {
      setError(err.message);
    } finally {
      setBackCoverLoading(false);
    }
  }

  async function handleSaveBackCoverEdit() {
    try {
      const { error: updateErr } = await supabase
        .from('book_projects')
        .update({ back_cover_text: backCoverText })
        .eq('id', project.id);
      if (updateErr) throw updateErr;
      onUpdate({ ...project, back_cover_text: backCoverText });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(backCoverText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const safeName = (project.title || 'couverture').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Couverture</h3>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {project.cover_image_url && (
          <div style={{ flexShrink: 0 }}>
            <img
              src={project.cover_image_url}
              alt="Couverture générée"
              style={{ width: 180, borderRadius: 8, border: '1px solid #2a2f3a', display: 'block' }}
            />
            <a
              href={project.cover_image_url}
              download={`${safeName}_couverture.png`}
              style={{ fontSize: 12, color: '#d4a95a', display: 'block', marginTop: 8, textAlign: 'center' }}
            >
              Télécharger
            </a>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ marginTop: 0 }}>Prompt (en anglais, pour l'IA image)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décris l'ambiance visuelle voulue, ou clique sur 'Suggérer un prompt'."
            style={{ minHeight: 120 }}
          />

          {error && <div className="error-box">{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="secondary" onClick={handleSuggestPrompt} disabled={promptLoading}>
              {promptLoading ? 'Rédaction…' : 'Suggérer un prompt'}
            </button>
            <button onClick={handleGenerateImage} disabled={imageLoading}>
              {imageLoading ? 'Génération…' : project.cover_image_url ? 'Régénérer' : "Générer l'image"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #2a2f3a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>4e de couverture</h4>
          <button className="secondary" onClick={handleGenerateBackCover} disabled={backCoverLoading}>
            {backCoverLoading ? 'Rédaction…' : backCoverText ? 'Régénérer' : 'Générer la 4e de couverture'}
          </button>
        </div>

        {backCoverText ? (
          <>
            <textarea
              value={backCoverText}
              onChange={(e) => setBackCoverText(e.target.value)}
              onBlur={handleSaveBackCoverEdit}
              style={{ minHeight: 160, fontSize: 14, lineHeight: 1.6 }}
            />
            <button className="secondary" onClick={handleCopy}>
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#9aa0ac' }}>
            Pas encore de texte généré pour la 4e de couverture.
          </p>
        )}
      </div>
    </div>
  );
}
