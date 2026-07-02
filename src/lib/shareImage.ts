import type { RefObject } from 'react';
import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { shareLink } from '@/lib/share';

// Résultat réel du partage (pour informer l'utilisateur). `cancelled` = l'utilisateur a fermé
// la feuille de partage sans partager (ne rien faire, pas de faux succès).
export type ShareOutcome = 'shared' | 'downloaded' | 'copied' | 'manual' | 'cancelled';
export type Captured = { uri?: string; blob?: Blob } | null;

// --- Implémentation NATIVE (iOS/Android) ---
// Capture la carte (View) en PNG via react-native-view-shot.
export async function captureCard(ref: RefObject<unknown>): Promise<Captured> {
  try {
    const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile' });
    // iOS renvoie un chemin NU (sans scheme) → expo-sharing exige une URL `file://`.
    const withScheme = /^(file|content|https?):/.test(uri) ? uri : `file://${uri}`;
    return { uri: withScheme };
  } catch {
    return null;
  }
}

// Partage l'image via la feuille système (expo-sharing), sinon Share, sinon lien texte.
export async function shareResultImage(
  captured: Captured,
  opts: { message: string; url: string },
): Promise<ShareOutcome> {
  if (captured?.uri) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(captured.uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager mon résultat',
        });
        return 'shared';
      }
    } catch {
      /* on tente le partage RN standard */
    }
    try {
      await Share.share({ message: `${opts.message}\n${opts.url}`, url: captured.uri });
      return 'shared';
    } catch {
      return 'manual';
    }
  }
  return (await shareLink(opts.message, opts.url)) as ShareOutcome;
}
