// Post-build : injecte favicon + balises Open Graph dans dist/index.html.
// Nécessaire car `output: single` (SPA) ignore app/+html.tsx. Exécuté après `expo export`.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'dist/index.html';
const MARKER = '<!-- djassafoot-meta -->';
const IMG = 'https://djassafoot.pages.dev/og-image.jpg';
const SITE = 'https://djassafoot.pages.dev/';
const DESC = 'Pronostique la Coupe du Monde 2026 et défie tes amis dans des ligues privées. 🪙';

let html = readFileSync(FILE, 'utf8');
if (html.includes(MARKER)) {
  console.log('inject-web-meta : déjà présent, rien à faire.');
  process.exit(0);
}

html = html.replace(/<title>[^<]*<\/title>/i, '<title>Djassa Foot</title>');

const tags = `${MARKER}
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#0A1230">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Djassa Foot">
<meta property="og:title" content="Djassa Foot — Pronos entre amis">
<meta property="og:description" content="${DESC}">
<meta property="og:image" content="${IMG}">
<meta property="og:image:secure_url" content="${IMG}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="630">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${SITE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Djassa Foot — Pronos entre amis">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${IMG}">
`;

if (!html.includes('</head>')) {
  console.error('inject-web-meta : </head> introuvable dans', FILE);
  process.exit(1);
}
html = html.replace('</head>', `${tags}</head>`);
writeFileSync(FILE, html);
console.log('✅ inject-web-meta : favicon + Open Graph injectés dans', FILE);
