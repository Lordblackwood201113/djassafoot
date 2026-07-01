// Implémentation par DÉFAUT (= natif iOS/Android, et SSR). No-op pour l'instant.
// Metro charge ce fichier en natif ; `analytics.web.ts` est utilisé sur le web (posthog-js).
// Phase 9 (build natif) : remplacer ces stubs par `posthog-react-native`.
import type { AnalyticsProps, EventName } from './analyticsEvents';

export function initAnalytics(): void {}

export function identifyUser(_userId: string, _props?: AnalyticsProps): void {}

export function resetAnalytics(): void {}

export function track(_event: EventName, _props?: AnalyticsProps): void {}

export { EVENTS } from './analyticsEvents';
export type { AnalyticsProps, EventName } from './analyticsEvents';
