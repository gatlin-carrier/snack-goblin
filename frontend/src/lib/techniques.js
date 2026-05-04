// Glossary of advanced cooking techniques. Matched terms in recipe instructions get
// linked to a YouTube search so the user can watch a quick tutorial.

// Map: pattern (regex source, case-insensitive) → search query for YouTube
export const TECHNIQUES = [
  // Knife cuts
  { match: /\bjulienne\w*\b/i, query: 'how to julienne vegetables' },
  { match: /\bbrunoise\w*\b/i, query: 'brunoise cut technique' },
  { match: /\bchiffonade\w*\b/i, query: 'how to chiffonade herbs' },
  { match: /\bbatonnet\w*\b/i, query: 'batonnet cut technique' },
  { match: /\bsmall dice\b/i, query: 'how to small dice vegetables' },
  { match: /\bmince\w*\b/i, query: 'how to mince garlic and herbs' },

  // Heat techniques
  { match: /\bdeglaz\w+/i, query: 'how to deglaze a pan' },
  { match: /\bsauté\w*/i, query: 'how to sauté' },
  { match: /\bbraise\w*/i, query: 'how to braise meat' },
  { match: /\bsear\w*/i, query: 'how to sear meat properly' },
  { match: /\bblanch\w*/i, query: 'how to blanch vegetables' },
  { match: /\bsweat\b/i, query: 'how to sweat vegetables' },
  { match: /\bbaste\w*/i, query: 'how to baste meat' },
  { match: /\bconfit\b/i, query: 'how to confit' },
  { match: /\bsous vide\b/i, query: 'sous vide basics' },
  { match: /\bpoach\w*/i, query: 'how to poach' },
  { match: /\bcaramelize\w*/i, query: 'how to caramelize onions' },
  { match: /\breduce\b/i, query: 'how to reduce a sauce' },
  { match: /\breduction\b/i, query: 'how to make a sauce reduction' },

  // Sauces and emulsions
  { match: /\bemulsif\w+/i, query: 'how to emulsify sauce' },
  { match: /\bmount\w* (?:with|the)? butter\b/i, query: 'mounting butter into sauce' },
  { match: /\broux\b/i, query: 'how to make a roux' },
  { match: /\bbeurre blanc\b/i, query: 'how to make beurre blanc' },
  { match: /\bhollandaise\b/i, query: 'how to make hollandaise' },

  // Egg / dairy
  { match: /\btemper\w+/i, query: 'how to temper eggs' },
  { match: /\bcurdle\w*/i, query: 'how to prevent curdling' },
  { match: /\bsoft peaks?\b/i, query: 'whipping cream soft peaks' },
  { match: /\bstiff peaks?\b/i, query: 'whipping cream stiff peaks' },
  { match: /\bribbon stage\b/i, query: 'eggs to ribbon stage' },

  // Baking and dough
  { match: /\bproof\w*\b/i, query: 'how to proof bread dough' },
  { match: /\bbloom\w*\b(?=.*gelatin)|gelatin\b(?=.*bloom)/i, query: 'how to bloom gelatin' },
  { match: /\bfold\w*\b(?=.*flour|.*batter|.*egg whites)/i, query: 'how to fold ingredients into batter' },
  { match: /\bcream(?:ing|ed)? (?:butter|together)\b/i, query: 'how to cream butter and sugar' },
  { match: /\bknead\w*/i, query: 'how to knead dough' },
  { match: /\blaminat\w+ dough\b/i, query: 'how to laminate dough' },
  { match: /\bdocking\b|\bdock\s+(?:the\s+)?dough\b/i, query: 'how to dock pastry dough' },

  // Meat prep
  { match: /\bspatchcock\w*/i, query: 'how to spatchcock a chicken' },
  { match: /\bbutterfly\b/i, query: 'how to butterfly chicken or pork' },
  { match: /\bscore\b(?=.*skin|.*fat|.*meat)/i, query: 'how to score skin or fat on meat' },
  { match: /\btruss\w*/i, query: 'how to truss a chicken' },
  { match: /\bbrine\w*/i, query: 'how to brine meat' },
  { match: /\bdry-?brine\w*/i, query: 'dry brining technique' },

  // Misc
  { match: /\bmise en place\b/i, query: 'mise en place explained' },
  { match: /\btoast\w*\s+(?:the\s+)?(?:spices|nuts|seeds)\b/i, query: 'how to toast spices and nuts' },
  { match: /\bbloom\w*\s+(?:the\s+)?spices?\b/i, query: 'how to bloom spices' },
];

function youtubeUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

// Given a string, return an array of strings and {term, url} objects
// suitable for rendering as inline links.
export function linkifyTechniques(text) {
  if (!text || typeof text !== 'string') return [text];

  // Find all matches across all patterns, dedupe overlapping ones, then split
  const matches = [];
  for (const t of TECHNIQUES) {
    // Use a global flag for finding all occurrences
    const re = new RegExp(t.match.source, t.match.flags.includes('g') ? t.match.flags : t.match.flags + 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, term: m[0], query: t.query });
      if (m[0].length === 0) re.lastIndex++; // prevent infinite loop
    }
  }
  if (matches.length === 0) return [text];

  // Sort by start; remove overlaps (keep earliest, longest)
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const filtered = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build the segmented output
  const out = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push({ term: m.term, url: youtubeUrl(m.query) });
    cursor = m.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
