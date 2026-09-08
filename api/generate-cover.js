export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { prompt, openaiApiKey } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Le prompt est vide.' });
    }

    const apiKey = openaiApiKey;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Clé API OpenAI manquante. Configure ta clé dans Paramètres avant de générer une image.',
      });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        n: 1,
        size: '1024x1536', // format portrait ~2:3, le plus proche d'un ratio couverture de livre
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error(errText);
      return res.status(500).json({ error: `Erreur API OpenAI (${openaiRes.status}): ${errText}` });
    }

    const data = await openaiRes.json();
    const item = data.data[0];
    let imageBase64 = item.b64_json;

    // Sécurité : si jamais l'API renvoie une URL au lieu du base64, on la télécharge nous-mêmes
    if (!imageBase64 && item.url) {
      const imgRes = await fetch(item.url);
      const arrayBuffer = await imgRes.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    }

    if (!imageBase64) {
      return res.status(500).json({ error: "Réponse OpenAI inattendue : aucune image reçue." });
    }

    const revisedPrompt = item.revised_prompt || prompt;

    return res.status(200).json({ image_base64: imageBase64, revised_prompt: revisedPrompt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
