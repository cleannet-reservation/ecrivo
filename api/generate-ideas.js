import { callClaude, extractJson } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { bookType, genre, theme } = req.body;

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

    const text = await callClaude({ system, prompt, maxTokens: 2048 });
    const parsed = extractJson(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
