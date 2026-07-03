import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

// Callback Server-Side Verification (SSV) d'AdMob pour les pubs récompensées.
// URL à renseigner dans AdMob (unité récompensée → SSV) : {EXPO_PUBLIC_CONVEX_SITE_URL}/admob-ssv
// On répond TOUJOURS 200 (même si signature invalide / quota atteint / rejeu) pour éviter les
// retentatives d'AdMob ; le CRÉDIT n'a lieu que si la signature est valide (via l'action Node).
http.route({
  path: '/admob-ssv',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const raw = url.search.startsWith('?') ? url.search.slice(1) : url.search;
    // Le contenu SIGNÉ = toute la query string AVANT `&signature=` (telle que reçue).
    const sigIdx = raw.indexOf('&signature=');
    const p = url.searchParams;
    const signature = p.get('signature') ?? '';
    const keyId = p.get('key_id') ?? '';
    const userId = p.get('user_id') ?? '';
    const transactionId = p.get('transaction_id') ?? '';

    // Callback malformé → 200 (retenter n'aiderait pas).
    if (sigIdx === -1 || !signature || !keyId || !userId || !transactionId) {
      return new Response('OK', { status: 200 });
    }

    const signedContent = raw.slice(0, sigIdx);
    try {
      // Succès OU rejet PERMANENT (signature/clé invalide, quota, rejeu) → la vérif a abouti → 200.
      await ctx.runAction(internal.adsNode.verifyAndCredit, {
        signedContent,
        signature,
        keyId,
        userId,
        transactionId,
      });
      return new Response('OK', { status: 200 });
    } catch {
      // Erreur TRANSITOIRE (fetch des clés en échec, etc.) → 500 pour qu'AdMob RETENTE,
      // au lieu de perdre définitivement le crédit d'une pub légitimement visionnée.
      return new Response('verification error', { status: 500 });
    }
  }),
});

export default http;
