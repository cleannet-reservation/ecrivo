import { callClaude } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { bookTitle, genre, chapterExcerpts, existingStyleNotes } = req.body;

    const system = `Tu es un analyste littéraire. Tu extrais un profil de style concis et réutilisable à partir d'un texte, pour qu'un autre auteur puisse reproduire la même voix dans un livre futur. Tu réponds uniquement avec le profil de style, sans commentaire méta, sans balises markdown.`;

    const prompt = `Analyse les extraits suivants du livre "${bookTitle}" (genre: ${genre}) et décris le style d'écriture en 150-250 mots : ton, rythme de phrase, niveau de vocabulaire, façon de gérer les dialogues, particularités récurrentes.

${existingStyleNotes ? `Profil de style existant de la collection à affiner/compléter (ne le contredis pas, enrichis-le):\n${existingStyleNotes}\n\n` : ''}Extraits:
${chapterExcerpts}

Réponds avec le profil de style mis à jour, prêt à être réutilisé comme instruction pour un autre livre de la même collection.`;

    const content = await callClaude({ system, prompt, maxTokens: 1024 });
    return res.status(200).json({ style_notes: content.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
