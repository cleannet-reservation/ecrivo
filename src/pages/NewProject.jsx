import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { callApi } from '../lib/apiClient';

// "flow" = le mode de fonctionnement interne de l'appli : 'roman' (chapitres rédigés)
// ou 'carnet' (pages à remplir, bas contenu). La base de données et les API ne
// connaissent que ces deux valeurs ; le type précis est transmis à l'IA via le genre.
const BOOK_TYPES = [
  { value: 'roman', label: 'Roman / histoire courte', flow: 'roman' },
  { value: 'carnet', label: 'Carnet / journal (bas contenu)', flow: 'carnet' },
  { value: 'enfants', label: 'Livre pour enfants', flow: 'roman' },
  { value: 'guide', label: 'Guide pratique / how-to', flow: 'roman' },
  { value: 'recettes', label: 'Livre de recettes', flow: 'roman' },
  { value: 'devperso', label: 'Développement personnel', flow: 'roman' },
  { value: 'coloriage', label: 'Livre de coloriage / activités (bas contenu)', flow: 'carnet' },
  { value: 'poesie', label: 'Poésie / recueil de textes', flow: 'roman' },
  { value: 'bio', label: 'Biographie / mémoires', flow: 'roman' },
  { value: 'citations', label: 'Livre de citations / motivation (bas contenu)', flow: 'carnet' },
  { value: 'autre', label: 'Autre (personnalisé)', flow: null },
];

export default function NewProject() {
  const navigate = useNavigate();
  const [typeValue, setTypeValue] = useState('roman');
  const [customType, setCustomType] = useState('');
  const [customFlow, setCustomFlow] = useState('roman');
  const [genre, setGenre] = useState('');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ideas, setIdeas] = useState(null);
  const [creating, setCreating] = useState(false);

  const [collections, setCollections] = useState([]);
  const [collectionId, setCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');

  const [targetPages, setTargetPages] = useState(90);
  const [targetChapters, setTargetChapters] = useState(18);

  const selectedType = BOOK_TYPES.find((t) => t.value === typeValue) || BOOK_TYPES[0];
  const bookType = selectedType.flow || customFlow;
  const isStandardType = typeValue === 'roman' || typeValue === 'carnet';
  const typeLabel =
    typeValue === 'autre'
      ? customType.trim()
      : selectedType.label.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  // Pour les deux types d'origine, rien ne change. Pour les autres, le type est
  // ajouté au genre : il est alors transmis à toutes les étapes (plan, chapitres, fiche).
  const fullGenre = isStandardType || !typeLabel ? genre : `${typeLabel} — ${genre}`;
  const fullTheme = isStandardType || !typeLabel ? theme : `Type d'ouvrage : ${typeLabel}.\n${theme}`;

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    const { data } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });
    setCollections(data || []);
  }

  function getSelectedCollection() {
    return collections.find((c) => c.id === collectionId);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIdeas(null);
    try {
      const res = await callApi('/api/book-concept', { action: 'ideas', bookType, genre: fullGenre, theme: fullTheme });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors de la génération des idées.');
      }
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

      let finalCollectionId = collectionId || null;

      if (!finalCollectionId && newCollectionName.trim()) {
        const { data: newCol, error: colErr } = await supabase
          .from('collections')
          .insert({ user_id: userData.user.id, name: newCollectionName.trim() })
          .select()
          .single();
        if (colErr) throw colErr;
        finalCollectionId = newCol.id;
      }

      const { data, error } = await supabase
        .from('book_projects')
        .insert({
          user_id: userData.user.id,
          collection_id: finalCollectionId,
          title: idea.title,
          genre: fullGenre,
          book_type: bookType,
          status: 'concept',
          concept: idea,
          target_pages: bookType === 'roman' ? Number(targetPages) : null,
          target_chapters: bookType === 'roman' ? Number(targetChapters) : null,
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
          <select value={typeValue} onChange={(e) => setTypeValue(e.target.value)}>
            {BOOK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {typeValue === 'autre' && (
            <>
              <label>Précise le type de livre</label>
              <input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="ex: livre de blagues, cahier de mots mêlés, guide de voyage..."
                required
              />

              <label>Structure du livre</label>
              <select value={customFlow} onChange={(e) => setCustomFlow(e.target.value)}>
                <option value="roman">Texte en chapitres rédigés</option>
                <option value="carnet">Carnet : pages à remplir (bas contenu)</option>
              </select>
            </>
          )}

          <label>Genre (ex: thriller, romance, développement personnel...)</label>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} required />

          <label>Thème ou idée de départ</label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Décris librement ce que tu as en tête, même vague."
            required
          />

          {bookType === 'roman' && (
            <>
              <label>Nombre de pages souhaité</label>
              <input
                type="number"
                min={20}
                max={600}
                value={targetPages}
                onChange={(e) => setTargetPages(e.target.value)}
              />
              <p style={{ fontSize: 12, color: '#9aa0ac', marginTop: 4 }}>
                Amazon KDP exige un minimum d'environ 79 pages pour activer la 4e de couverture en
                impression papier — 90 est une valeur sûre avec marge.
              </p>

              <label>Nombre de chapitres souhaité</label>
              <input
                type="number"
                min={4}
                max={60}
                value={targetChapters}
                onChange={(e) => setTargetChapters(e.target.value)}
              />
              <p style={{ fontSize: 12, color: '#9aa0ac', marginTop: 4 }}>
                Chaque chapitre visera environ {Math.round((targetPages * 270) / Math.max(targetChapters, 1))} mots
                pour atteindre la longueur totale souhaitée.
              </p>
            </>
          )}

          <label>Collection (pour garder un style cohérent entre livres)</label>
          <select
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              if (e.target.value) setNewCollectionName('');
            }}
          >
            <option value="">Aucune collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {!collectionId && (
            <>
              <label>Ou crée une nouvelle collection (optionnel)</label>
              <input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="ex: Thrillers de l'été"
              />
            </>
          )}

          {collectionId && getSelectedCollection()?.style_notes && (
            <p style={{ fontSize: 12, color: '#9aa0ac', marginTop: 8 }}>
              Un profil de style existe pour cette collection — il sera utilisé pour garder la cohérence.
            </p>
          )}

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
