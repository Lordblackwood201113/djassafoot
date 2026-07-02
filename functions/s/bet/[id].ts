import { ConvexHttpClient } from 'convex/browser';

import { api } from '../../../convex/_generated/api';

interface Env {
  EXPO_PUBLIC_CONVEX_URL: string;
}

const attr = (s: unknown) =>
  String(s ?? '').replace(/[<>&"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;',
  );
// Espace ASCII pour les milliers (cohérent avec l'image OG ; évite U+202F).
const nb = (n: unknown) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Page de partage d'un pari : sert des balises Open Graph PAR PARI (image = /og/bet/:id) pour que
// le lien s'« unfurl » avec la carte perso sur WhatsApp/FB/X, puis redirige l'HUMAIN vers l'app.
// Les crawlers lisent les meta (ils ne suivent pas le redirect JS).
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = String(ctx.params.id);
  const origin = new URL(ctx.request.url).origin;

  let bet: {
    status?: string;
    payout?: number;
    home?: string;
    away?: string;
    homeScore?: number | null;
    awayScore?: number | null;
    matchStatus?: string;
  } | null = null;
  try {
    bet = await new ConvexHttpClient(ctx.env.EXPO_PUBLIC_CONVEX_URL).query(api.bets.publicShare, {
      id: id as never,
    });
  } catch {
    /* meta génériques si indisponible */
  }

  const showScore = bet && (bet.matchStatus === 'live' || bet.matchStatus === 'finished');
  const score = showScore ? `${bet?.homeScore ?? 0}-${bet?.awayScore ?? 0}` : '';
  const title =
    bet?.status === 'won'
      ? `J'ai gagné +${nb(bet.payout)} jetons sur Djassa Foot !`
      : bet
        ? `Mon prono ${bet.home ?? ''} ${score} ${bet.away ?? ''} sur Djassa Foot`
        : 'Djassa Foot — Pronos entre amis';
  const desc = 'Pronostique la Coupe du Monde 2026 et défie tes amis dans des ligues privées.';
  // Image OG = carte du pari générée À LA DEMANDE côté serveur (/og/bet/:id). Cet endpoint retombe
  // lui-même sur l'image générique en cas d'erreur → l'unfurl montre toujours quelque chose.
  const img = `${origin}/og/bet/${encodeURIComponent(id)}`;
  // L'humain est redirigé vers la page PUBLIQUE (visible sans compte), pas la route auth-gated.
  const appUrl = `${origin}/partage/${encodeURIComponent(id)}`;

  const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(title)}</title>
<meta name="description" content="${attr(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Djassa Foot">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${origin}/s/bet/${encodeURIComponent(id)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${img}">
<style>html,body{background:#0A0A0B;color:#F5F5F4;font-family:system-ui,sans-serif;margin:0}</style>
</head><body>
<p style="padding:24px">Redirection vers Djassa Foot… <a style="color:#6FA287" href="${appUrl}">Ouvrir l'app</a></p>
<script>location.replace(${JSON.stringify(appUrl)})</script>
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
};
