import { callClaude, extractJson } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { title, genre, bookType, concept, styleNotes } = req.body;

    const system = `Tu es un éditeur et structurologue de livres. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

    const typeInstruction =
      bookType === 'carnet'
        ? 'Découpe en sections de type carnet (ex: introduction, puis sections thématiques répétitives avec prompts).'
        : 'Découpe en chapitres avec une vraie progression narrative (exposition, montée en tension, résolution).';

    const prompt = `Génère un plan détaillé pour ce livre.

Titre: ${title}
Genre: ${genre}
Pitch: ${concept?.pitch || ''}
Public cible: ${concept?.target_audience || ''}
${styleNotes ? `Style à respecter (cohérence avec la collection):\n${styleNotes}\n` : ''}
${typeInstruction}

Génère entre 8 et 14 chapitres/sections. Réponds avec un JSON de cette forme exacte:
{
  "chapters": [
    { "title": "Titre du chapitre", "summary": "Résumé en 2-3 phrases de ce qui doit s'y passer/contenir" }
  ]
}`;

    const text = await callClaude({ system, prompt, maxTokens: 3072 });
    const parsed = extractJson(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
