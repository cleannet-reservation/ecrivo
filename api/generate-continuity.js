import { callClaude, extractJson } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { bookTitle, genre, chapterContents } = req.body;

    const system = `Tu es un éditeur qui prépare la suite d'un roman. Tu analyses un livre terminé pour en extraire tout ce qui est nécessaire à la continuité d'une suite. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

    const prompt = `Voici le contenu complet (ou un résumé condensé) du livre "${bookTitle}" (genre: ${genre}) :

${chapterContents}

Analyse ce livre et prépare la suite. Réponds avec un JSON de cette forme exacte:
{
  "continuity_notes": "Résumé structuré pour l'auteur de la suite : personnages principaux et leur état à la fin, lieux importants, éléments d'intrigue résolus, fils narratifs laissés ouverts, ton général de l'univers (300-500 mots)",
  "next_book_pitch": "Un pitch en 2-3 phrases pour un tome suivant plausible, qui reprend un fil ouvert du premier livre",
  "suggested_title": "Un titre suggéré pour ce tome suivant"
}`;

    const text = await callClaude({ system, prompt, maxTokens: 2048 });
    const parsed = extractJson(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
