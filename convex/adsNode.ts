'use node';

import { v } from 'convex/values';
import crypto from 'node:crypto';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

// URL CANONIQUE (www) — l'hôte sans www renvoie un 301 vers celle-ci.
const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';

type VerifierKey = { keyId: number; pem: string; base64: string };
// Cache best-effort (isolats potentiellement recréés → re-fetch alors, peu coûteux).
let keyCache: { keys: VerifierKey[]; at: number } | null = null;

async function fetchKeys(): Promise<VerifierKey[]> {
  const res = await fetch(VERIFIER_KEYS_URL);
  if (!res.ok) throw new Error(`verifier-keys HTTP ${res.status}`); // → 500 côté http.ts (AdMob retente)
  const json = (await res.json()) as { keys?: VerifierKey[] };
  if (!Array.isArray(json.keys) || json.keys.length === 0) {
    throw new Error('verifier-keys: réponse invalide');
  }
  keyCache = { keys: json.keys, at: Date.now() };
  return json.keys;
}

async function getKeys(forceRefresh = false): Promise<VerifierKey[]> {
  if (!forceRefresh && keyCache && Date.now() - keyCache.at < 6 * 60 * 60 * 1000) {
    return keyCache.keys;
  }
  return fetchKeys();
}

// Vérifie la signature SSV d'AdMob (ECDSA/SHA-256, signature DER, clé publique PEM) puis crédite.
// Retour : { ok:true } crédité · { ok:false } signature/clé invalide (permanent, pas de retry).
// JETTE en cas d'erreur TRANSITOIRE (fetch des clés en échec) → http.ts répond 500 → AdMob retente.
export const verifyAndCredit = internalAction({
  args: {
    signedContent: v.string(),
    signature: v.string(),
    keyId: v.string(),
    userId: v.string(),
    transactionId: v.string(),
  },
  handler: async (ctx, { signedContent, signature, keyId, userId, transactionId }) => {
    // Sélection de la clé, avec refetch-on-miss (gère une rotation de clés AdMob).
    let keys = await getKeys();
    let key = keys.find((k) => String(k.keyId) === keyId);
    if (!key) {
      keys = await getKeys(true); // force le rafraîchissement au cas où la clé vient de tourner
      key = keys.find((k) => String(k.keyId) === keyId);
    }
    if (!key) return { ok: false, reason: 'key_not_found' }; // inconnue même après refresh → permanent

    // signature = base64url dans l'URL → buffer DER.
    const sig = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    let valid = false;
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(signedContent);
      verifier.end();
      valid = verifier.verify(key.pem, sig);
    } catch {
      valid = false;
    }
    if (!valid) return { ok: false, reason: 'bad_signature' };

    await ctx.runMutation(internal.ads.creditReward, { userId, transactionId });
    return { ok: true };
  },
});
