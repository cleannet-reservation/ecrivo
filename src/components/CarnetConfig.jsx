import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { exportCarnetToDocx } from '../lib/exportCarnetDocx';
import { exportCarnetToPdf } from '../lib/exportCarnetPdf';

const TEMPLATES = [
  { value: 'lined', label: 'Pages lignées (notes libres)' },
  { value: 'prompted', label: 'Pages à prompts (un prompt par page)' },
  { value: 'gratitude', label: 'Journal de gratitude quotidien' },
  { value: 'grid', label: 'Pages quadrillées (croquis/planning)' },
  { value: 'habit_tracker', label: 'Suivi d\'habitudes (tableau mensuel)' },
];

export default function CarnetConfig({ project, onUpdate }) {
  const config = project.carnet_config || {};
  const [template, setTemplate] = useState(config.template || 'prompted');
  const [numPages, setNumPages] = useState(config.num_pages || 30);
  const [linesPerPage, setLinesPerPage] = useState(config.lines_per_page || 10);
  const [theme, setTheme] = useState(project.concept?.pitch || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const hasContent = config.prompts && config.prompts.length > 0;

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-carnet-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          genre: project.genre,
          theme,
          concept: project.concept,
          template,
          numPages: Math.min(numPages, 60), // on limite le nombre de prompts uniques générés
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération du contenu du carnet.');
      const data = await res.json();

      const newConfig = {
        template,
        num_pages: Number(numPages),
        lines_per_page: Number(linesPerPage),
        intro_text: data.intro_text,
        prompts: data.prompts || [],
      };

      const { error: updateErr } = await supabase
        .from('book_projects')
        .update({ carnet_config: newConfig, status: 'plan' })
        .eq('id', project.id);
      if (updateErr) throw updateErr;

      onUpdate({ ...project, carnet_config: newConfig, status: 'plan' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      await exportCarnetToPdf(project);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportCarnetToDocx(project);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card">
      <div className="top-bar" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Configuration du carnet</h3>
        {hasContent && (
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

      <label>Type de mise en page</label>
      <select value={template} onChange={(e) => setTemplate(e.target.value)}>
        {TEMPLATES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label>Nombre de pages</label>
      <input
        type="number"
        min={1}
        max={400}
        value={numPages}
        onChange={(e) => setNumPages(e.target.value)}
      />

      {(template === 'lined' || template === 'prompted' || template === 'gratitude') && (
        <>
          <label>Lignes par page</label>
          <input
            type="number"
            min={2}
            max={30}
            value={linesPerPage}
            onChange={(e) => setLinesPerPage(e.target.value)}
          />
        </>
      )}

      <label>Thème / consigne pour les prompts</label>
      <textarea value={theme} onChange={(e) => setTheme(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Génération…' : hasContent ? 'Régénérer le contenu' : 'Générer le contenu du carnet'}
      </button>

      {hasContent && (
        <div style={{ marginTop: 20 }}>
          <label style={{ marginTop: 0 }}>Aperçu — texte d'intro</label>
          <p style={{ fontSize: 13, color: '#c9cbd1' }}>{config.intro_text}</p>

          <label>Aperçu — premiers prompts ({config.prompts.length} générés, réutilisés en boucle si {config.num_pages} {'>'} {config.prompts.length})</label>
          <ul style={{ fontSize: 13, color: '#c9cbd1', paddingLeft: 20 }}>
            {config.prompts.slice(0, 6).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
