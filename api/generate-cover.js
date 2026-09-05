export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Le prompt est vide.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          "OPENAI_API_KEY manquante dans les variables d'environnement Vercel. Ajoute-la dans Settings > Environment Variables (clé créée sur platform.openai.com/api-keys), puis redéploie.",
      });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1792',
        quality: 'standard',
        response_format: 'b64_json',
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error(errText);
      return res.status(500).json({ error: `Erreur API OpenAI (${openaiRes.status}): ${errText}` });
    }

    const data = await openaiRes.json();
    const imageBase64 = data.data[0].b64_json;
    const revisedPrompt = data.data[0].revised_prompt || prompt;

    return res.status(200).json({ image_base64: imageBase64, revised_prompt: revisedPrompt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
