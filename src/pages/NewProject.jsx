import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function NewProject() {
  const navigate = useNavigate();
  const [bookType, setBookType] = useState('roman');
  const [genre, setGenre] = useState('');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ideas, setIdeas] = useState(null);
  const [creating, setCreating] = useState(false);

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIdeas(null);
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookType, genre, theme }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération des idées.');
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(idea) {
    setCreating(true);
    setError('');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('book_projects')
        .insert({
          user_id: userData.user.id,
          title: idea.title,
          genre,
          book_type: bookType,
          status: 'concept',
          concept: idea,
        })
        .select()
        .single();
      if (error) throw error;
      navigate(`/project/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h2>Nouveau livre</h2>
      <div className="card">
        <form onSubmit={handleGenerate}>
          <label>Type de livre</label>
          <select value={bookType} onChange={(e) => setBookType(e.target.value)}>
            <option value="roman">Roman / histoire courte</option>
            <option value="carnet">Carnet / journal (bas contenu)</option>
          </select>

          <label>Genre (ex: thriller, romance, développement personnel...)</label>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} required />

          <label>Thème ou idée de départ</label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Décris librement ce que tu as en tête, même vague."
            required
          />

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Génération en cours…' : 'Générer des idées'}
          </button>
        </form>
      </div>

      {ideas && (
        <div>
          <h3>Choisis un concept</h3>
          <div className="concept-grid">
            {ideas.map((idea, i) => (
              <div
                key={i}
                className="concept-card"
                onClick={() => !creating && handleSelect(idea)}
              >
                <h4>{idea.title}</h4>
                <p>{idea.pitch}</p>
                <p><strong>Public :</strong> {idea.target_audience}</p>
                <p><strong>Mots-clés :</strong> {(idea.keywords || []).join(', ')}</p>
              </div>
            ))}
          </div>
          {creating && <p className="spinner-text">Création du projet…</p>}
        </div>
      )}
    </div>
  );
}
