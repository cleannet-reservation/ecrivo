import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportProjectToDocx } from '../lib/exportDocx';

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

  if (!project) return <p className="spinner-text">Chargement…</p>;

  const allDrafted = chapters.length > 0 && chapters.every((c) => c.content);

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
          <button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Export…' : 'Exporter en DOCX'}
          </button>
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

      {chapters.length === 0 && (
        <div className="card">
          <p style={{ color: '#9aa0ac' }}>Aucun plan généré pour l'instant.</p>
          <button onClick={handleGeneratePlan} disabled={planLoading}>
            {planLoading ? 'Génération du plan…' : 'Générer le plan de chapitres'}
          </button>
        </div>
      )}

      {chapters.map((chapter) => (
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
