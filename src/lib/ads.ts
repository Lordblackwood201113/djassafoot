// Wrapper PUB — implémentation par défaut = NO-OP (web).
// AdMob (react-native-google-mobile-ads) n'existe pas sur web → l'implémentation réelle vit dans
// `ads.native.ts` (Metro la choisit sur iOS/Android). Le bundle web ne référence jamais la lib.
// Le CRÉDIT des jetons se fait par la mutation Convex `ads.claimAdReward` (côté composant), après
// que la pub a été regardée.

export const isAdsSupported = false;

export async function initAds(): Promise<void> {
  /* no-op web */
}

// Montre une pub récompensée ; renvoie `true` si l'utilisateur a "gagné" la récompense. Web : false.
export async function showRewarded(): Promise<boolean> {
  return false;
}
