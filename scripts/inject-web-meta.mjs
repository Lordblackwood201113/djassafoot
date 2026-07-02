// Post-build : favicon de marque + balises Open Graph dans dist/index.html.
// Nécessaire car `output: single` (SPA) ignore app/+html.tsx. Exécuté après `expo export`.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = 'dist/index.html';
const MARKER = '<!-- djassafoot-meta -->';
const V = '5'; // bump pour forcer le rafraîchissement du favicon en cache
const IMG = 'https://djassafoot.pages.dev/og-image.jpg?v=3'; // bump quand l'image OG change (casse le cache WhatsApp/Facebook)
const SITE = 'https://djassafoot.pages.dev/';
const DESC = 'Pronostique la Coupe du Monde 2026 et défie tes amis dans des ligues privées. 🪙';

let html = readFileSync(FILE, 'utf8');
if (html.includes(MARKER)) {
  console.log('inject-web-meta : déjà présent, rien à faire.');
  process.exit(0);
}

// Titre
html = html.replace(/<title>[^<]*<\/title>/i, '<title>Djassa Foot</title>');

// Retire les icônes générées par Expo (dont le favicon.ico par défaut) pour éviter les doublons.
html = html.replace(/<link[^>]*rel=["']?(shortcut )?(icon|apple-touch-icon)["']?[^>]*>/gi, '');

const tags = `${MARKER}
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#0A0A0B">
<style>html,body,#root{background-color:#0A0A0B;}</style>
<link rel="icon" type="image/png" sizes="256x256" href="/icon.png?v=${V}">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon.png?v=${V}">
<link rel="shortcut icon" href="/favicon.png?v=${V}">
<link rel="apple-touch-icon" href="/icon.png?v=${V}">
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

// Écrase le favicon.ico par défaut d'Expo par le PNG de marque (les navigateurs modernes
// acceptent un PNG servi en /favicon.ico ; c'est ce que le navigateur charge par défaut).
if (existsSync('dist/favicon.png')) {
  copyFileSync('dist/favicon.png', 'dist/favicon.ico');
}

console.log('✅ inject-web-meta : favicon de marque + Open Graph injectés.');
