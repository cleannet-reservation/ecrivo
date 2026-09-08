import { callClaude, extractJson } from '../lib/claude.js';

async function handleIdeas(req, res) {
  const { bookType, genre, theme, anthropicApiKey } = req.body;

  const system = `Tu es un éditeur expérimenté spécialisé dans le marché Amazon KDP francophone. Tu génères des concepts de livres commercialement viables. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

  const typeInstruction =
    bookType === 'carnet'
      ? "Il s'agit d'un carnet/journal bas-contenu : le concept doit inclure une structure de pages répétitive (ex: prompts d'écriture quotidiens, sections à remplir)."
      : "Il s'agit d'un roman ou d'une histoire courte : le concept doit inclure une intrigue et des personnages.";

  const prompt = `Génère 4 concepts de livres différents pour le marché Amazon KDP francophone.

Genre: ${genre}
Thème/idée de départ: ${theme}
${typeInstruction}

Réponds avec un JSON de cette forme exacte:
{
  "ideas": [
    {
      "title": "Titre accrocheur",
      "pitch": "Pitch en 2-3 phrases",
      "target_audience": "Public cible précis",
      "keywords": ["mot-clé1", "mot-clé2", "mot-clé3", "mot-clé4", "mot-clé5"]
    }
  ]
}`;

  const text = await callClaude({ system, prompt, maxTokens: 2048, apiKey: anthropicApiKey });
  return extractJson(text);
}

async function handlePlan(req, res) {
  const { title, genre, bookType, concept, styleNotes, continuityNotes, numChapters, anthropicApiKey } = req.body;

  const system = `Tu es un éditeur et structurologue de livres. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

  const typeInstruction =
    bookType === 'carnet'
      ? 'Découpe en sections de type carnet (ex: introduction, puis sections thématiques répétitives avec prompts).'
      : 'Découpe en chapitres avec une vraie progression narrative (exposition, montée en tension, résolution).';

  const chapterCountInstruction =
    bookType === 'carnet'
      ? 'Génère entre 8 et 14 chapitres/sections.'
      : numChapters
      ? `Génère EXACTEMENT ${numChapters} chapitres, ni plus ni moins.`
      : "Génère entre 16 et 22 chapitres, pour garantir un livre d'au moins 25 000 mots au total (nécessaire pour dépasser le seuil minimum de pages imposé par Amazon KDP pour l'impression papier).";

  const prompt = `Génère un plan détaillé pour ce livre.

Titre: ${title}
Genre: ${genre}
Pitch: ${concept?.pitch || ''}
Public cible: ${concept?.target_audience || ''}
${styleNotes ? `Style à respecter (cohérence avec la collection):\n${styleNotes}\n` : ''}
${continuityNotes ? `Ce livre est une SUITE. Continuité à respecter impérativement (personnages, fin du tome précédent, fils narratifs à reprendre):\n${continuityNotes}\n` : ''}
${typeInstruction}

${chapterCountInstruction} Réponds avec un JSON de cette forme exacte:
{
  "chapters": [
    { "title": "Titre du chapitre", "summary": "Résumé en 2-3 phrases de ce qui doit s'y passer/contenir" }
  ]
}`;

  const text = await callClaude({
    system,
    prompt,
    maxTokens: numChapters ? Math.min(8000, 1800 + numChapters * 200) : 3072,
    apiKey: anthropicApiKey,
  });
  return extractJson(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { action } = req.body;
    let result;
    if (action === 'plan') {
      result = await handlePlan(req, res);
    } else {
      result = await handleIdeas(req, res);
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
