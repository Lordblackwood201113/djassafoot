// Implémentation PUB native via react-native-google-mobile-ads.
// Le CRÉDIT des jetons est fait CÔTÉ SERVEUR par la mutation `ads.claimAdReward` (appelée depuis le
// composant quand cette fonction résout `true`), plafonnée 3/jour. Pas de SSV (jetons virtuels).
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// ⚠️ Restreint à ANDROID pour l'instant : aucun `iosAppId` AdMob n'est configuré (l'App ID fourni
// est celui d'Android). Sans GADApplicationIdentifier, le SDK CRASHE au démarrage sur iOS.
// → sur iOS on se comporte comme le web (no-op) tant que l'app AdMob iOS n'existe pas.
export const isAdsSupported = Platform.OS === 'android';

// En DEV : unité de TEST Google → se REMPLIT TOUJOURS (n'importe quel appareil/émulateur), joue une
// pub de test, déclenche `EARNED_REWARD`. Comme on crédite CÔTÉ CLIENT (plus de SSV), l'unité n'a
// aucune importance pour le crédit. En prod : notre vraie unité récompensée.
const REWARDED_UNIT_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-8445698013703110/6639356691';
const LOAD_TIMEOUT_MS = 30000; // filet anti-blocage si la pub ne charge jamais

let initialized = false;

// Consentement RGPD (UMP) — requis avant de charger des pubs pour les utilisateurs UE.
async function requestConsent(): Promise<void> {
  try {
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch {
    /* consentement indisponible → on continue (pubs non personnalisées) */
  }
}

export async function initAds(): Promise<void> {
  if (!isAdsSupported || initialized) return;
  try {
    await requestConsent();
    await mobileAds().initialize();
    initialized = true;
  } catch {
    /* SDK indisponible → l'app continue sans pubs */
  }
}

// Charge + montre une pub récompensée. Résout `true` si récompense gagnée, `false` sinon.
// Garanti de résoudre (timeout de secours) → l'UI ne reste jamais bloquée sur « Chargement… ».
export async function showRewarded(): Promise<boolean> {
  if (!isAdsSupported) return false;
  return new Promise<boolean>((resolve) => {
    let earned = false;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      // Le timeout ne borne QUE le CHARGEMENT : une fois la pub prête, on l'annule pour ne pas
      // résoudre `false` en plein visionnage (réseau lent + pub longue → récompense perdue). M3.
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      ad.show().catch(() => finish(false));
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));

    function finish(result: boolean) {
      if (done) return;
      done = true;
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      if (timer) clearTimeout(timer);
      resolve(result);
    }

    timer = setTimeout(() => finish(false), LOAD_TIMEOUT_MS);
    ad.load();
  });
}
