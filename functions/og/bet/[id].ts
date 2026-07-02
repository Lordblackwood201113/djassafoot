import { ConvexHttpClient } from 'convex/browser';
import { ImageResponse } from 'workers-og';

import { api } from '../../../convex/_generated/api';

interface Env {
  EXPO_PUBLIC_CONVEX_URL: string;
}

// Échappe le texte utilisateur avant injection dans le HTML parsé par workers-og.
const esc = (s: unknown) =>
  String(s ?? '').replace(/[<>&]/g, (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'));
// Milliers avec une espace ASCII (U+0020) — PAS toLocaleString qui utilise U+202F, glyphe absent
// de la police Sora → afficherait un « tofu » sur les gros gains.
const nb = (n: unknown) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Image OG dynamique (1200×630) d'un résultat de pari — thème Noir. Satori (workers-og) tourne
// sur le runtime Cloudflare (HTMLRewriter). Chaque <div> a display:flex (contrainte Satori).
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = String(ctx.params.id).replace(/\.png$/, '');
  const origin = new URL(ctx.request.url).origin;

  try {
    let bet: {
      status?: string;
      payout?: number;
      home?: string;
      away?: string;
      homeScore?: number | null;
      awayScore?: number | null;
      matchStatus?: string;
      username?: string | null;
    } | null = null;
    try {
      bet = await new ConvexHttpClient(ctx.env.EXPO_PUBLIC_CONVEX_URL).query(api.bets.publicShare, {
        id: id as never,
      });
    } catch {
      /* rendu générique si la donnée est indisponible */
    }

    const loadFont = async (file: string) => {
      const r = await fetch(`${origin}/fonts/${file}`);
      if (!r.ok) throw new Error(`font ${file} ${r.status}`);
      return r.arrayBuffer();
    };
    const [sora, inter] = await Promise.all([
      loadFont('Sora_800ExtraBold.ttf'),
      loadFont('Inter_600SemiBold.ttf'),
    ]);

    const won = bet?.status === 'won';
    const lost = bet?.status === 'lost';
    const title = won ? 'Prono gagné' : lost ? 'Prono perdu' : 'Mon prono';
    const showScore = bet && (bet.matchStatus === 'live' || bet.matchStatus === 'finished');
    const score = showScore ? `${bet?.homeScore ?? 0} - ${bet?.awayScore ?? 0}` : 'VS';
    const gain = won ? `+${nb(bet?.payout)} jetons` : lost ? 'Perdu' : `${nb(bet?.payout)} jetons`;
    const gainColor = won ? '#6FA287' : lost ? '#E5484D' : '#F5F5F4';

    const html = `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;background:#0A0A0B;padding:72px;font-family:Inter;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;font-family:Sora;font-size:38px;">
          <div style="display:flex;color:#FFFFFF;">Djassa</div>
          <div style="display:flex;color:#6B7280;">Foot</div>
        </div>
        <div style="display:flex;font-size:22px;color:#6B7280;">Coupe du Monde 2026</div>
      </div>
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;font-family:Sora;font-size:56px;color:#FFFFFF;margin-bottom:28px;">${esc(title)}</div>
        <div style="display:flex;align-items:center;font-family:Sora;font-size:64px;color:#FFFFFF;">
          <div style="display:flex;">${esc(bet?.home || 'Match')}</div>
          <div style="display:flex;color:#A1A1AA;padding:0 32px;">${esc(score)}</div>
          <div style="display:flex;">${esc(bet?.away || '')}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;">
          <div style="display:flex;font-size:24px;color:#A1A1AA;margin-bottom:8px;">Gain</div>
          <div style="display:flex;font-family:Sora;font-size:60px;color:${gainColor};">${esc(gain)}</div>
        </div>
        <div style="display:flex;font-size:26px;color:#FFFFFF;">${bet?.username ? '@' + esc(bet.username) : 'djassafoot.pages.dev'}</div>
      </div>
    </div>`;

    return new ImageResponse(html, {
      width: 1200,
      height: 630,
      format: 'png',
      fonts: [
        { name: 'Sora', data: sora, weight: 800, style: 'normal' },
        { name: 'Inter', data: inter, weight: 600, style: 'normal' },
      ],
    });
  } catch {
    // Jamais de 500 au crawler : on retombe sur l'image OG générique de l'app.
    return Response.redirect(`${origin}/og-image.jpg`, 302);
  }
};
