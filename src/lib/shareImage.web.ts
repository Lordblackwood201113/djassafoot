import type { RefObject } from 'react';
import { toBlob } from 'html-to-image';

import { shareLink } from '@/lib/share';

// Résultat réel du partage (pour informer l'utilisateur). `cancelled` = l'utilisateur a fermé
// la feuille de partage sans partager (ne rien faire, pas de faux succès).
export type ShareOutcome = 'shared' | 'downloaded' | 'copied' | 'manual' | 'cancelled';
export type Captured = { uri?: string; blob?: Blob } | null;

// --- Implémentation WEB (RN-Web) ---
// Capture le nœud DOM de la carte en PNG via html-to-image (les images distantes TheSportsDB
// s'inlinent grâce à leur en-tête CORS `access-control-allow-origin: *`).
export async function captureCard(ref: RefObject<unknown>): Promise<Captured> {
  try {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) return null;
    const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true, backgroundColor: '#0A0A0B' });
    return blob ? { blob } : null;
  } catch {
    return null;
  }
}

// Partage le fichier via Web Share API (mobile HTTPS), sinon télécharge l'image, sinon lien texte.
export async function shareResultImage(
  captured: Captured,
  opts: { message: string; url: string },
): Promise<ShareOutcome> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;

  if (captured?.blob) {
    const file = new File([captured.blob], 'djassafoot.png', { type: 'image/png' });
    if (nav?.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: opts.message, url: opts.url });
        return 'shared';
      } catch (e) {
        // Annulation par l'utilisateur (AbortError) → ne PAS télécharger, ne rien faire.
        if (e && (e as { name?: string }).name === 'AbortError') return 'cancelled';
        // Autre erreur réelle → on retombe sur le téléchargement.
      }
    }
    try {
      const href = URL.createObjectURL(captured.blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'djassafoot.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
      return 'downloaded';
    } catch {
      /* indisponible */
    }
  }
  return (await shareLink(opts.message, opts.url)) as ShareOutcome;
}
