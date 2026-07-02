import { ConvexHttpClient } from 'convex/browser';
import { ImageResponse } from 'workers-og';

import { api } from '../../../convex/_generated/api';
import { frTeam } from '../../../src/lib/teamNames';

interface Env {
  EXPO_PUBLIC_CONVEX_URL: string;
}

// Échappe le texte utilisateur avant injection dans le HTML parsé par workers-og.
const esc = (s: unknown) =>
  String(s ?? '').replace(/[<>&]/g, (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'));
// Milliers avec une espace ASCII (U+0020) — PAS toLocaleString qui utilise U+202F, glyphe absent
// de la police Sora → afficherait un « tofu » sur les gros gains.
const nb = (n: unknown) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Drapeau national via TheSportsDB (réplique de src/lib/flags.ts).
const FLAG_ALIAS: Record<string, string> = {
  'Korea Republic': 'South-Korea',
  'Bosnia-Herzegovina': 'Bosnia-and-Herzegovina',
  Curaçao: 'Curacao',
};
function flagUrl(name?: string | null): string | null {
  if (!name) return null;
  const file = (FLAG_ALIAS[name] ?? name).replace(/'/g, '').replace(/\s+/g, '-');
  return `https://www.thesportsdb.com/images/icons/flags/shiny/64/${encodeURIComponent(file)}.png`;
}
function toBase64(buf: ArrayBuffer): string {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
// Drapeau inliné en data-URL (satori ne fait pas de fetch réseau). Best-effort : null si indispo,
// pour NE JAMAIS casser toute l'image à cause d'un drapeau (fallback bloc neutre).
async function flagDataUri(name?: string | null): Promise<string | null> {
  const url = flagUrl(name);
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return `data:image/png;base64,${toBase64(await r.arrayBuffer())}`;
  } catch {
    return null;
  }
}

type Leg = { label?: string; result?: string | null };
type Bet = {
  status?: string;
  payout?: number;
  stake?: number;
  home?: string;
  away?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenalty?: number | null;
  awayPenalty?: number | null;
  matchStatus?: string;
  username?: string | null;
  legs?: Leg[];
};

// Bloc drapeau (data-URL) ou carré neutre si indisponible.
const flagBox = (uri: string | null) =>
  uri
    ? `<img src="${uri}" width="72" height="72" style="border-radius:10px;" />`
    : `<div style="display:flex;width:72px;height:72px;border-radius:10px;background:#1C1C20;"></div>`;

// Image OG dynamique (1200×630) d'un résultat de pari — thème Noir, fidèle à la carte de l'app.
// Satori (workers-og) tourne sur le runtime Cloudflare. Chaque <div> a display:flex (contrainte
// Satori). Générée À LA DEMANDE côté serveur → montre TOUJOURS le pari (pas de course, iOS inclus).
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = String(ctx.params.id).replace(/\.png$/, '');
  const origin = new URL(ctx.request.url).origin;

  try {
    let bet: Bet | null = null;
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
    const [sora, inter, interB, homeFlag, awayFlag] = await Promise.all([
      loadFont('Sora_800ExtraBold.ttf'),
      loadFont('Inter_500Medium.ttf'),
      loadFont('Inter_600SemiBold.ttf'),
      flagDataUri(bet?.home),
      flagDataUri(bet?.away),
    ]);

    const won = bet?.status === 'won';
    const lost = bet?.status === 'lost';
    const title = won ? 'Prono gagné' : lost ? 'Prono perdu' : 'Mon prono';
    const showScore = bet && (bet.matchStatus === 'live' || bet.matchStatus === 'finished');
    const score = showScore ? `${bet?.homeScore ?? 0} - ${bet?.awayScore ?? 0}` : 'VS';
    const hasPen = bet?.homePenalty != null && bet?.awayPenalty != null;
    const gainLabel = won ? 'Gain' : lost ? 'Résultat' : 'Gain potentiel';
    const gain = won ? `+${nb(bet?.payout)} jetons` : lost ? 'Perdu' : `${nb(bet?.payout)} jetons`;
    const gainColor = won ? '#6FA287' : lost ? '#E5484D' : '#F5F5F4';

    // Combiné : jusqu'à 4 legs (+ « … »), pastille colorée par résultat (pas de glyphe → pas de tofu).
    const legs = (bet?.legs ?? []).slice(0, 4);
    const extra = (bet?.legs?.length ?? 0) - legs.length;
    const dot = (result?: string | null) => {
      const c = result === 'won' ? '#6FA287' : result === 'lost' ? '#E5484D' : '#6B7280';
      return `<div style="display:flex;width:16px;height:16px;border-radius:8px;background:${c};margin-right:18px;"></div>`;
    };
    const legRows = legs
      .map(
        (l) =>
          `<div style="display:flex;align-items:center;margin-bottom:14px;">${dot(l.result)}<div style="display:flex;font-size:26px;color:#D4D4D8;">${esc(l.label)}</div></div>`,
      )
      .join('');
    const legsBlock =
      legRows.length || extra > 0
        ? `<div style="display:flex;flex-direction:column;margin-top:6px;">${legRows}${
            extra > 0
              ? `<div style="display:flex;font-size:24px;color:#6B7280;">+${extra} autre${extra > 1 ? 's' : ''}</div>`
              : ''
          }</div>`
        : '';

    const html = `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;background:#0A0A0B;padding:64px 72px;font-family:Inter;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;font-family:Sora;font-size:36px;">
          <div style="display:flex;color:#FFFFFF;">Djassa</div>
          <div style="display:flex;color:#6B7280;">Foot</div>
        </div>
        <div style="display:flex;font-size:22px;color:#6B7280;">Coupe du Monde 2026</div>
      </div>

      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;font-family:Sora;font-size:52px;color:#FFFFFF;margin-bottom:26px;">${esc(title)}</div>
        <div style="display:flex;align-items:center;">
          <div style="display:flex;align-items:center;flex:1;">
            ${flagBox(homeFlag)}
            <div style="display:flex;font-family:Sora;font-size:42px;color:#FFFFFF;margin-left:24px;">${esc(bet?.home ? frTeam(bet.home) : 'Match')}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;padding:0 28px;">
            <div style="display:flex;font-family:Sora;font-size:56px;color:#FFFFFF;">${esc(score)}</div>
            ${hasPen ? `<div style="display:flex;font-size:22px;color:#A1A1AA;margin-top:6px;">t.a.b. ${esc(bet?.homePenalty)}-${esc(bet?.awayPenalty)}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;justify-content:flex-end;flex:1;">
            <div style="display:flex;font-family:Sora;font-size:42px;color:#FFFFFF;margin-right:24px;">${esc(bet?.away ? frTeam(bet.away) : '')}</div>
            ${flagBox(awayFlag)}
          </div>
        </div>
        ${legsBlock}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;">
          <div style="display:flex;font-size:24px;color:#A1A1AA;margin-bottom:8px;">${esc(gainLabel)}</div>
          <div style="display:flex;font-family:Sora;font-size:58px;color:${gainColor};">${esc(gain)}</div>
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
        { name: 'Inter', data: inter, weight: 500, style: 'normal' },
        { name: 'Inter', data: interB, weight: 600, style: 'normal' },
      ],
    });
  } catch {
    // Jamais de 500 au crawler : on retombe sur l'image OG générique de l'app.
    return Response.redirect(`${origin}/og-image.jpg`, 302);
  }
};
