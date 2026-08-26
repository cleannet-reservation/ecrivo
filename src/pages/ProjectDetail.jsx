import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportProjectToDocx } from '../lib/exportDocx';
import { exportProjectToPdf } from '../lib/exportPdf';
import CarnetConfig from '../components/CarnetConfig.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [genChapterId, setGenChapterId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [collection, setCollection] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const { data: proj, error: projErr } = await supabase
      .from('book_projects')
      .select('*')
      .eq('id', id)
      .single();
    if (projErr) return setError(projErr.message);
    setProject(proj);

    if (proj.collection_id) {
      const { data: col } = await supabase
        .from('collections')
        .select('*')
        .eq('id', proj.collection_id)
        .single();
      setCollection(col || null);
    }

    const { data: chaps, error: chapErr } = await supabase
      .from('chapters')
      .select('*')
      .eq('project_id', id)
      .order('order_index', { ascending: true });
    if (chapErr) return setError(chapErr.message);
    setChapters(chaps || []);
  }

  async function handleGeneratePlan() {
    setPlanLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          genre: project.genre,
          bookType: project.book_type,
          concept: project.concept,
          styleNotes: collection?.style_notes || '',
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération du plan.');
      const data = await res.json();

      const rows = data.chapters.map((c, i) => ({
        project_id: id,
        order_index: i,
        title: c.title,
        summary: c.summary,
        content: '',
        status: 'planned',
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('chapters')
        .insert(rows)
        .select();
      if (insertErr) throw insertErr;

      setChapters(inserted.sort((a, b) => a.order_index - b.order_index));

      await supabase.from('book_projects').update({ status: 'plan' }).eq('id', id);
      setProject({ ...project, status: 'plan' });
    } catch (err) {
      setError(err.message);
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleGenerateChapter(chapter) {
    setGenChapterId(chapter.id);
    setError('');
    try {
      const previousSummary = chapters
        .filter((c) => c.order_index < chapter.order_index && c.content)
        .map((c) => `${c.title}: ${c.content.slice(0, 400)}`)
        .join('\n\n');

      const res = await fetch('/api/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: project.title,
          genre: project.genre,
          bookType: project.book_type,
          chapterTitle: chapter.title,
          chapterSummary: chapter.summary,
          previousSummary,
          styleNotes: collection?.style_notes || '',
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération du chapitre.');
      const data = await res.json();

      const { error: updateErr } = await supabase
        .from('chapters')
        .update({ content: data.content, status: 'drafted' })
        .eq('id', chapter.id);
      if (updateErr) throw updateErr;

      setChapters((prev) =>
        prev.map((c) => (c.id === chapter.id ? { ...c, content: data.content, status: 'drafted' } : c))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGenChapterId(null);
    }
  }

  function startEdit(chapter) {
    setEditingId(chapter.id);
    setEditText(chapter.content);
  }

  async function saveEdit(chapter) {
    const { error: updateErr } = await supabase
      .from('chapters')
      .update({ content: editText, status: 'edited' })
      .eq('id', chapter.id);
    if (updateErr) return setError(updateErr.message);
    setChapters((prev) =>
      prev.map((c) => (c.id === chapter.id ? { ...c, content: editText, status: 'edited' } : c))
    );
    setEditingId(null);
  }

  async function handleExtractStyle() {
    setStyleLoading(true);
    setError('');
    try {
      const chapterExcerpts = chapters
        .filter((c) => c.content)
        .map((c) => c.content.slice(0, 600))
        .join('\n\n---\n\n');

      const res = await fetch('/api/generate-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: project.title,
          genre: project.genre,
          chapterExcerpts,
          existingStyleNotes: collection?.style_notes || '',
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'extraction du style.");
      const data = await res.json();

      if (collection) {
        const { error: updateErr } = await supabase
          .from('collections')
          .update({ style_notes: data.style_notes })
          .eq('id', collection.id);
        if (updateErr) throw updateErr;
        setCollection({ ...collection, style_notes: data.style_notes });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setStyleLoading(false);
    }
  }

  async function handleGenerateListing() {
    setListingLoading(true);
    setError('');
    try {
      const chapterSummaries = isCarnet
        ? `Carnet avec ${project.carnet_config?.num_pages || ''} pages. Intro: ${project.carnet_config?.intro_text || ''}. Exemples de prompts: ${(project.carnet_config?.prompts || []).slice(0, 5).join(' / ')}`
        : chapters.map((c) => `${c.title}: ${c.summary}`).join('\n');

      const res = await fetch('/api/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          genre: project.genre,
          bookType: project.book_type,
          concept: project.concept,
          chapterSummaries,
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération de la fiche produit.');
      const data = await res.json();

      const { error: updateErr } = await supabase
        .from('book_projects')
        .update({ listing: data })
        .eq('id', id);
      if (updateErr) throw updateErr;

      setProject({ ...project, listing: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setListingLoading(false);
    }
  }

  function copyToClipboard(text, field) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportProjectToDocx(project, chapters);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      await exportProjectToPdf(project, chapters);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingPdf(false);
    }
  }

  if (!project) return <p className="spinner-text">Chargement…</p>;

  const isCarnet = project.book_type === 'carnet';
  const allDrafted = !isCarnet && chapters.length > 0 && chapters.every((c) => c.content);
  const carnetReady = isCarnet && project.carnet_config?.prompts?.length > 0;
  const readyForListing = allDrafted || carnetReady;

  return (
    <div>
      <div className="top-bar">
        <div>
          <h2 style={{ margin: 0 }}>{project.title}</h2>
          <p style={{ color: '#9aa0ac', margin: '4px 0 0 0', fontSize: 13 }}>
            {project.genre} · {project.book_type === 'carnet' ? 'Carnet' : 'Roman / texte court'}
          </p>
        </div>
        {allDrafted && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="secondary" onClick={handleExportPdf} disabled={exportingPdf}>
              {exportingPdf ? 'Export…' : 'Exporter en PDF'}
            </button>
            <button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Export…' : 'Exporter en DOCX'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      {project.concept && (
        <div className="card">
          <h3>Concept</h3>
          <p>{project.concept.pitch}</p>
          <p style={{ color: '#9aa0ac', fontSize: 13 }}>
            <strong>Public :</strong> {project.concept.target_audience}
          </p>
        </div>
      )}

      {collection && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Collection : {collection.name}</h3>
            {allDrafted && (
              <button className="secondary" onClick={handleExtractStyle} disabled={styleLoading}>
                {styleLoading
                  ? 'Analyse…'
                  : collection.style_notes
                  ? 'Mettre à jour le style'
                  : 'Extraire le style de ce livre'}
              </button>
            )}
          </div>
          {collection.style_notes ? (
            <p style={{ fontSize: 13, color: '#9aa0ac', marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {collection.style_notes}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#9aa0ac', marginTop: 12 }}>
              Pas encore de profil de style pour cette collection. Termine ce livre puis clique sur
              "Extraire le style" pour que les prochains livres de cette collection gardent la même voix.
            </p>
          )}
        </div>
      )}

      {isCarnet ? (
        <CarnetConfig project={project} onUpdate={setProject} />
      ) : (
        chapters.length === 0 && (
          <div className="card">
            <p style={{ color: '#9aa0ac' }}>Aucun plan généré pour l'instant.</p>
            <button onClick={handleGeneratePlan} disabled={planLoading}>
              {planLoading ? 'Génération du plan…' : 'Générer le plan de chapitres'}
            </button>
          </div>
        )
      )}

      {readyForListing && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Fiche produit Amazon</h3>
            <button
              className="secondary"
              onClick={handleGenerateListing}
              disabled={listingLoading}
            >
              {listingLoading
                ? 'Génération…'
                : project.listing
                ? 'Régénérer'
                : 'Générer la fiche produit'}
            </button>
          </div>

          {project.listing && (
            <div style={{ marginTop: 16 }}>
              <label style={{ marginTop: 0 }}>Description longue</label>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                {project.listing.description}
              </p>
              <button
                className="secondary"
                onClick={() => copyToClipboard(project.listing.description, 'description')}
              >
                {copiedField === 'description' ? 'Copié !' : 'Copier'}
              </button>

              <label>Description courte / 4e de couverture</label>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{project.listing.short_description}</p>
              <button
                className="secondary"
                onClick={() => copyToClipboard(project.listing.short_description, 'short')}
              >
                {copiedField === 'short' ? 'Copié !' : 'Copier'}
              </button>

              <label>Sous-titre suggéré</label>
              <p style={{ fontSize: 14 }}>{project.listing.subtitle_suggestion}</p>

              <label>Catégories Amazon suggérées</label>
              <ul style={{ fontSize: 14, color: '#c9cbd1', paddingLeft: 20 }}>
                {(project.listing.categories || []).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>

              <label>Mots-clés backend (7 slots KDP)</label>
              <p style={{ fontSize: 14 }}>{(project.listing.keywords || []).join(', ')}</p>
              <button
                className="secondary"
                onClick={() => copyToClipboard((project.listing.keywords || []).join(', '), 'keywords')}
              >
                {copiedField === 'keywords' ? 'Copié !' : 'Copier'}
              </button>
            </div>
          )}
        </div>
      )}

      {!isCarnet && chapters.map((chapter) => (
        <div key={chapter.id} className="card">
          <div className="chapter-row" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 8 }}>
            <div>
              <strong>{chapter.order_index + 1}. {chapter.title}</strong>
              <p style={{ color: '#9aa0ac', fontSize: 13, margin: '4px 0 0 0' }}>{chapter.summary}</p>
            </div>
            <span className={`badge ${chapter.content ? 'done' : ''}`}>
              {chapter.content ? 'rédigé' : 'à écrire'}
            </span>
          </div>

          {!chapter.content && (
            <button onClick={() => handleGenerateChapter(chapter)} disabled={genChapterId === chapter.id}>
              {genChapterId === chapter.id ? 'Rédaction en cours…' : 'Générer ce chapitre'}
            </button>
          )}

          {chapter.content && editingId !== chapter.id && (
            <>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                {chapter.content.slice(0, 500)}
                {chapter.content.length > 500 ? '…' : ''}
              </p>
              <button className="secondary" onClick={() => startEdit(chapter)}>Éditer</button>
              <button className="secondary" onClick={() => handleGenerateChapter(chapter)} disabled={genChapterId === chapter.id}>
                {genChapterId === chapter.id ? 'Régénération…' : 'Régénérer'}
              </button>
            </>
          )}

          {editingId === chapter.id && (
            <>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ minHeight: 300 }}
              />
              <button onClick={() => saveEdit(chapter)}>Enregistrer</button>
              <button className="secondary" onClick={() => setEditingId(null)}>Annuler</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
