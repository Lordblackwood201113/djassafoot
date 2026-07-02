import type { RefObject } from 'react';
import { Platform } from 'react-native';

// Capture la carte (ShareCard) en PNG → Blob (pour upload Convex).
// Split au RUNTIME (pas via extension .web) : web = html-to-image (nœud DOM), natif =
// react-native-view-shot (View). Les imports dynamiques ne sont ÉVALUÉS que dans leur branche
// → chaque lib ne s'exécute que sur sa plateforme (l'autre est bundlée mais jamais évaluée).
export async function captureCardBlob(ref: RefObject<unknown>): Promise<Blob | null> {
  try {
    if (Platform.OS === 'web') {
      const node = (ref.current as unknown as HTMLElement | null) ?? null;
      if (!node) return null;
      const { toBlob } = await import('html-to-image');
      return await toBlob(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0A0A0B' });
    }
    const { captureRef } = await import('react-native-view-shot');
    const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile' });
    const withScheme = /^(file|content|https?):/.test(uri) ? uri : `file://${uri}`;
    return await (await fetch(withScheme)).blob();
  } catch {
    return null;
  }
}
