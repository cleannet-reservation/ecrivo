const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export async function callClaude({ system, prompt, maxTokens = 4096 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement Vercel.');
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur API Claude (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

// Extrait un JSON même si le modèle a ajouté du texte autour (sécurité supplémentaire)
export function extractJson(text) {
  const start = text.indexOf('{') === -1 ? text.indexOf('[') : Math.min(
    ...[text.indexOf('{'), text.indexOf('[')].filter((i) => i !== -1)
  );
  const endBrace = text.lastIndexOf('}');
  const endBracket = text.lastIndexOf(']');
  const end = Math.max(endBrace, endBracket);
  const jsonStr = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    return repairAndParseJson(jsonStr);
  }
}

// Répare un JSON coupé en plein milieu (réponse tronquée) ou légèrement malformé,
// en le retronquant au dernier élément complet d'un tableau et en refermant proprement.
function repairAndParseJson(jsonStr) {
  const arrayStart = jsonStr.indexOf('[');
  if (arrayStart === -1) {
    throw new Error('Réponse JSON invalide et non réparable.');
  }

  const closers = [']}', ']', '}', ']}}'];

  // On recule depuis la fin de la chaîne, à chaque accolade fermante rencontrée,
  // on tente de refermer proprement le JSON à cet endroit et de le parser.
  for (let i = jsonStr.length - 1; i >= arrayStart; i--) {
    if (jsonStr[i] !== '}') continue;
    const candidate = jsonStr.slice(0, i + 1);
    for (const closer of closers) {
      try {
        return JSON.parse(candidate + closer);
      } catch (e) {
        // on essaie le prochain closer, ou la prochaine position
      }
    }
  }

  throw new Error(
    'La réponse générée a été coupée avant la fin (souvent parce que trop de contenu a été demandé en une fois). Réessaie, ou réduis le nombre de chapitres demandé.'
  );
}
