import { callClaude, extractJson } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { title, genre, pitch, bookType, side, frontCoverPrompt } = req.body;

    const system = `Tu es un directeur artistique spécialisé dans les couvertures de livres pour Amazon KDP. Tu écris des prompts en ANGLAIS pour des IA de génération d'image (DALL-E, Midjourney). Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

    const sideInstruction =
      side === 'back'
        ? `Ceci est pour le FOND de la 4e de couverture (le dos du livre), PAS la couverture principale. Le texte du résumé sera superposé sur toute l'image, donc :
- Le visuel doit être beaucoup plus sobre et discret qu'une couverture : texture, ambiance, dégradé de couleur, motif discret — PAS de scène ou personnage détaillé qui distrairait de la lecture du texte
- Garde la même palette de couleurs et ambiance générale que le recto pour la cohérence visuelle de l'objet livre
- L'image doit rester lisible avec du texte blanc ou clair superposé dessus sur toute sa hauteur, pas seulement en bas
${frontCoverPrompt ? `\nPrompt utilisé pour le recto (pour cohérence de style et de palette) :\n${frontCoverPrompt}\n` : ''}`
        : `Ceci est pour le RECTO (couverture principale) :
- Décrit une illustration/scène/ambiance, PAS de texte ni de typographie dans l'image (l'IA image gère mal le texte)
- Pas de visage de personnage identifiable en gros plan (souvent raté par les IA image)
- Précise "empty space at bottom third for title text" ou équivalent pour laisser de la place au titre`;

    const prompt = `Écris un prompt de génération d'image pour ${side === 'back' ? 'le fond de la 4e de couverture' : 'la couverture'} de ce livre.

Titre: ${title}
Genre: ${genre}
Type: ${bookType === 'carnet' ? 'carnet/journal bas-contenu' : 'roman'}
Pitch: ${pitch || ''}

Contraintes impératives pour le prompt :
- En anglais
- Précise une ambiance de couleurs cohérente avec le genre
- Format vertical portrait (mentionne un ratio proche de 2:3)
${sideInstruction}

Réponds avec un JSON de cette forme exacte:
{
  "prompt": "le prompt complet en anglais, prêt à copier-coller"
}`;

    const text = await callClaude({ system, prompt, maxTokens: 1024 });
    const parsed = extractJson(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
