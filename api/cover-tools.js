import { callClaude, extractJson } from '../lib/claude.js';

async function handleCoverPrompt(req, res) {
  const { title, genre, pitch, bookType, side, frontCoverPrompt, anthropicApiKey } = req.body;

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

  const text = await callClaude({ system, prompt, maxTokens: 1024, apiKey: anthropicApiKey });
  return extractJson(text);
}

async function handleBackCoverText(req, res) {
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
  return { back_cover_text: content.trim() };
}

async function handleImage(req, res) {
  const { prompt, openaiApiKey } = req.body;
  if (!prompt || !prompt.trim()) {
    throw Object.assign(new Error('Le prompt est vide.'), { statusCode: 400 });
  }
  if (!openaiApiKey) {
    throw Object.assign(
      new Error('Clé API OpenAI manquante. Configure ta clé dans Paramètres avant de générer une image.'),
      { statusCode: 400 }
    );
  }

  const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1536',
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error(errText);
    throw new Error(`Erreur API OpenAI (${openaiRes.status}): ${errText}`);
  }

  const data = await openaiRes.json();
  const item = data.data[0];
  let imageBase64 = item.b64_json;

  if (!imageBase64 && item.url) {
    const imgRes = await fetch(item.url);
    const arrayBuffer = await imgRes.arrayBuffer();
    imageBase64 = Buffer.from(arrayBuffer).toString('base64');
  }

  if (!imageBase64) {
    throw new Error('Réponse OpenAI inattendue : aucune image reçue.');
  }

  return { image_base64: imageBase64, revised_prompt: item.revised_prompt || prompt };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { action } = req.body;
    let result;
    if (action === 'image') {
      result = await handleImage(req, res);
    } else if (action === 'backcover') {
      result = await handleBackCoverText(req, res);
    } else {
      result = await handleCoverPrompt(req, res);
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}
