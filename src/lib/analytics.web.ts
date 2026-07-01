// Implémentation WEB (posthog-js). Metro choisit ce fichier pour la plateforme web.
import posthog from 'posthog-js';

import type { AnalyticsProps, EventName } from './analyticsEvents';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
let ready = false;

export function initAnalytics(): void {
  if (ready || !KEY || typeof window === 'undefined') return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    person_profiles: 'identified_only', // pas de profil pour les visiteurs anonymes
    autocapture: false, // on envoie nos events métier explicitement
  });
  ready = true;
}

export function identifyUser(userId: string, props?: AnalyticsProps): void {
  if (ready) posthog.identify(userId, props);
}

export function resetAnalytics(): void {
  if (ready) posthog.reset();
}

export function track(event: EventName, props?: AnalyticsProps): void {
  if (ready) posthog.capture(event, props);
}

export { EVENTS } from './analyticsEvents';
export type { AnalyticsProps, EventName } from './analyticsEvents';
