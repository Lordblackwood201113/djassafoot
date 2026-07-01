import { Platform, Share } from 'react-native';

// Origine de l'app (pour construire les liens de partage). Domaine de prod par défaut.
export function appOrigin(): string {
  return typeof window !== 'undefined' && window.location
    ? window.location.origin
    : 'https://djassafoot.pages.dev';
}

// Partage multi-plateforme : feuille native / Web Share / presse-papiers.
// Retourne le mode réellement utilisé pour informer l'utilisateur.
export async function shareLink(message: string, url: string): Promise<'shared' | 'copied' | 'manual'> {
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: `${message}\n${url}` });
      return 'shared';
    } catch {
      return 'manual';
    }
  }
  const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.share) {
    try {
      await nav.share({ title: 'Djassa Foot', text: message, url });
      return 'shared';
    } catch {
      return 'manual';
    }
  }
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    /* indisponible (contexte non sécurisé) */
  }
  return 'manual';
}
