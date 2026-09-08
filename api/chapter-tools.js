import { callClaude, extractJson } from '../lib/claude.js';

async function handleChapter(req, res) {
  const {
    bookTitle, genre, bookType, chapterTitle, chapterSummary,
    previousSummary, styleNotes, continuityNotes, targetWords, anthropicApiKey,
  } = req.body;

  const system = `Tu es un auteur professionnel écrivant en français pour le marché Amazon KDP. Tu écris un texte fluide, engageant, sans jamais mentionner que le contenu est généré par IA. Tu réponds uniquement avec le texte du chapitre, sans titre répété, sans commentaire méta, sans balises markdown.`;

  const typeInstruction =
    bookType === 'carnet'
      ? "Rédige le contenu de cette section de carnet : inclut des prompts d'écriture concrets, des espaces de réflexion, un ton chaleureux et motivant."
      : "Rédige ce chapitre avec un vrai style narratif, des dialogues si pertinent, et une cohérence avec ce qui précède. Développe les scènes en profondeur (descriptions, ressentis des personnages, dialogues étoffés) plutôt que de résumer les événements — c'est essentiel pour atteindre la longueur cible.";

  const lengthInstruction = targetWords
    ? `Longueur cible: environ ${targetWords} mots (marge acceptable de ±15%). Ne t'arrête pas en dessous.`
    : `Longueur cible: ${bookType === 'carnet' ? '800 à 1500' : '1600 à 2200'} mots. Ne t'arrête pas en dessous de cette fourchette.`;

  const prompt = `Livre: "${bookTitle}" (genre: ${genre})
${styleNotes ? `\nProfil de style à respecter impérativement (cohérence avec les autres livres de la collection):\n${styleNotes}\n` : ''}${continuityNotes ? `\nCe livre est une SUITE. Continuité à respecter impérativement:\n${continuityNotes}\n` : ''}
${previousSummary ? `Résumé de ce qui précède dans CE livre:\n${previousSummary}\n\n` : ''}Chapitre à écrire: "${chapterTitle}"
Ce qui doit s'y passer: ${chapterSummary}

${typeInstruction}

${lengthInstruction}`;

  const content = await callClaude({ system, prompt, maxTokens: 6144, apiKey: anthropicApiKey });
  return { content: content.trim() };
}

async function handleStyle(req, res) {
  const { bookTitle, genre, chapterExcerpts, existingStyleNotes, anthropicApiKey } = req.body;

  const system = `Tu es un analyste littéraire. Tu extrais un profil de style concis et réutilisable à partir d'un texte, pour qu'un autre auteur puisse reproduire la même voix dans un livre futur. Tu réponds uniquement avec le profil de style, sans commentaire méta, sans balises markdown.`;

  const prompt = `Analyse les extraits suivants du livre "${bookTitle}" (genre: ${genre}) et décris le style d'écriture en 150-250 mots : ton, rythme de phrase, niveau de vocabulaire, façon de gérer les dialogues, particularités récurrentes.

${existingStyleNotes ? `Profil de style existant de la collection à affiner/compléter (ne le contredis pas, enrichis-le):\n${existingStyleNotes}\n\n` : ''}Extraits:
${chapterExcerpts}

Réponds avec le profil de style mis à jour, prêt à être réutilisé comme instruction pour un autre livre de la même collection.`;

  const content = await callClaude({ system, prompt, maxTokens: 1024, apiKey: anthropicApiKey });
  return { style_notes: content.trim() };
}

async function handleContinuity(req, res) {
  const { bookTitle, genre, chapterContents, anthropicApiKey } = req.body;

  const system = `Tu es un éditeur qui prépare la suite d'un roman. Tu analyses un livre terminé pour en extraire tout ce qui est nécessaire à la continuité d'une suite. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

  const prompt = `Voici le contenu complet (ou un résumé condensé) du livre "${bookTitle}" (genre: ${genre}) :

${chapterContents}

Analyse ce livre et prépare la suite. Réponds avec un JSON de cette forme exacte:
{
  "continuity_notes": "Résumé structuré pour l'auteur de la suite : personnages principaux et leur état à la fin, lieux importants, éléments d'intrigue résolus, fils narratifs laissés ouverts, ton général de l'univers (300-500 mots)",
  "next_book_pitch": "Un pitch en 2-3 phrases pour un tome suivant plausible, qui reprend un fil ouvert du premier livre",
  "suggested_title": "Un titre suggéré pour ce tome suivant"
}`;

  const text = await callClaude({ system, prompt, maxTokens: 2048, apiKey: anthropicApiKey });
  return extractJson(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { action } = req.body;
    let result;
    if (action === 'style') {
      result = await handleStyle(req, res);
    } else if (action === 'continuity') {
      result = await handleContinuity(req, res);
    } else {
      result = await handleChapter(req, res);
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
