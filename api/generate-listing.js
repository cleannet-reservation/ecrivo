import { callClaude, extractJson } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { title, genre, bookType, concept, chapterSummaries } = req.body;

    const system = `Tu es un expert en référencement Amazon KDP francophone. Tu écris des fiches produit optimisées pour la conversion et la découvrabilité. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

    const prompt = `Génère une fiche produit Amazon KDP complète pour ce livre.

Titre: ${title}
Genre: ${genre}
Type: ${bookType === 'carnet' ? 'carnet/journal' : 'roman/histoire courte'}
Pitch: ${concept?.pitch || ''}
Public cible: ${concept?.target_audience || ''}
Résumé des chapitres: ${chapterSummaries}

Réponds avec un JSON de cette forme exacte:
{
  "description": "Description longue et accrocheuse pour la page produit Amazon (150-250 mots, avec accroche, présentation de l'intrigue sans spoiler, et incitation à l'achat)",
  "short_description": "Version courte pour les réseaux sociaux ou la 4e de couverture (2-3 phrases)",
  "categories": ["Catégorie Amazon 1 précise", "Catégorie Amazon 2 précise", "Catégorie Amazon 3 précise"],
  "keywords": ["mot-clé backend 1", "mot-clé backend 2", "mot-clé backend 3", "mot-clé backend 4", "mot-clé backend 5", "mot-clé backend 6", "mot-clé backend 7"],
  "subtitle_suggestion": "Suggestion de sous-titre accrocheur pour la couverture"
}`;

    const text = await callClaude({ system, prompt, maxTokens: 2048 });
    const parsed = extractJson(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
