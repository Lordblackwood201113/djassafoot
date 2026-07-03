// Wrapper PUB — implémentation par défaut = NO-OP (web).
// AdMob (react-native-google-mobile-ads) n'existe pas sur web → l'implémentation réelle vit
// dans `ads.native.ts` (Metro la choisit automatiquement sur iOS/Android). Ainsi le bundle web
// ne référence JAMAIS la lib native. Le bouton de pub s'affiche selon `isAdsSupported`.

export const isAdsSupported = false;

export async function initAds(): Promise<void> {
  /* no-op web */
}

// Montre une pub récompensée ; le crédit est fait côté serveur (SSV). Renvoie `true` si
// l'utilisateur a "gagné" la récompense. Sur web : toujours false.
export async function showRewarded(_userId: string): Promise<boolean> {
  return false;
}
