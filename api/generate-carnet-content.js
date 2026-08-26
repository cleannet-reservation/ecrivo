import { callClaude, extractJson } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { title, genre, theme, concept, template, numPages } = req.body;

    const templateInstruction = {
      prompted: `Génère ${numPages} prompts d'écriture courts et variés (une phrase chacun), adaptés à ce carnet. Ils peuvent se répéter avec des variations si le nombre est élevé, mais garde de la diversité sur les 20-30 premiers.`,
      gratitude: `Génère ${numPages} prompts de gratitude/réflexion quotidienne courts (une phrase chacun), variés et inspirants.`,
      habit_tracker: `Génère 1 à 3 titres de sections pour un suivi d'habitudes (ex: noms de mois ou de périodes), pas besoin de ${numPages} entrées ici.`,
      lined: `Génère seulement un titre général pour les pages lignées (ex: "Mes notes"), pas besoin de ${numPages} prompts.`,
      grid: `Génère seulement un titre général pour les pages quadrillées (ex: "Mes croquis"), pas besoin de ${numPages} prompts.`,
    }[template] || `Génère ${numPages} courts prompts adaptés à ce carnet.`;

    const system = `Tu es un créateur de carnets bas-contenu pour Amazon KDP francophone. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.`;

    const prompt = `Carnet: "${title}" (genre: ${genre})
Thème: ${theme}
Pitch: ${concept?.pitch || ''}
Type de template: ${template}

${templateInstruction}

Réponds avec un JSON de cette forme exacte:
{
  "intro_text": "Un court texte d'introduction pour la première page du carnet (2-4 phrases, chaleureux et motivant)",
  "prompts": ["prompt ou titre 1", "prompt ou titre 2", "..."]
}`;

    const text = await callClaude({ system, prompt, maxTokens: 3072 });
    const parsed = extractJson(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
