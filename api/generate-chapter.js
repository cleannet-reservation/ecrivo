import { callClaude } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { bookTitle, genre, bookType, chapterTitle, chapterSummary, previousSummary } = req.body;

    const system = `Tu es un auteur professionnel écrivant en français pour le marché Amazon KDP. Tu écris un texte fluide, engageant, sans jamais mentionner que le contenu est généré par IA. Tu réponds uniquement avec le texte du chapitre, sans titre répété, sans commentaire méta, sans balises markdown.`;

    const typeInstruction =
      bookType === 'carnet'
        ? 'Rédige le contenu de cette section de carnet : inclut des prompts d\'écriture concrets, des espaces de réflexion, un ton chaleureux et motivant.'
        : 'Rédige ce chapitre avec un vrai style narratif, des dialogues si pertinent, et une cohérence avec ce qui précède.';

    const prompt = `Livre: "${bookTitle}" (genre: ${genre})

${previousSummary ? `Résumé de ce qui précède:\n${previousSummary}\n\n` : ''}Chapitre à écrire: "${chapterTitle}"
Ce qui doit s'y passer: ${chapterSummary}

${typeInstruction}

Longueur cible: 800 à 1500 mots.`;

    const content = await callClaude({ system, prompt, maxTokens: 4096 });
    return res.status(200).json({ content: content.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
