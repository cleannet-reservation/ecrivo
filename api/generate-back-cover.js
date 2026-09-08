import { callClaude } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { title, genre, bookType, pitch, targetAudience, chapterSummaries, anthropicApiKey } = req.body;

    const system = `Tu es un copywriter spécialisé dans les 4e de couverture de livres, pour le marché francophone (Amazon KDP). Tu écris un texte prêt à être imprimé au dos du livre, percutant, qui donne envie d'acheter sans dévoiler la fin. Tu réponds uniquement avec le texte final, sans titre, sans commentaire méta, sans balises markdown.`;

    const typeInstruction =
      bookType === 'carnet'
        ? "Ce n'est pas un roman mais un carnet/journal bas-contenu : le texte doit vendre l'usage et le bénéfice du carnet (à qui il s'adresse, ce que ça va lui apporter au quotidien), pas une intrigue."
        : "Structure attendue : une accroche courte et percutante en une phrase, puis 2-3 paragraphes qui plantent le décor et la tension sans spoiler la résolution, puis une phrase finale qui interpelle le lecteur ou pose une question.";

    const prompt = `Rédige la 4e de couverture pour ce livre.

Titre: ${title}
Genre: ${genre}
Pitch: ${pitch || ''}
Public cible: ${targetAudience || ''}
${chapterSummaries ? `Résumé des chapitres (pour contexte, ne pas spoiler la fin):\n${chapterSummaries}\n` : ''}

${typeInstruction}

Longueur: 120 à 200 mots. Ton engageant, phrases courtes et rythmées.`;

    const content = await callClaude({ system, prompt, maxTokens: 1024, apiKey: anthropicApiKey });
    return res.status(200).json({ back_cover_text: content.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
