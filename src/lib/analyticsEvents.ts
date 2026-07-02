// Noms d'events + types, partagés par les deux implémentations (web / natif).
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export const EVENTS = {
  onboardingStarted: 'onboarding_started',
  userSignedUp: 'user_signed_up',
  userSignedIn: 'user_signed_in',
  predictionPlaced: 'prediction_placed',
  predictionEdited: 'prediction_edited',
  matchViewed: 'match_viewed',
  dailyBonusClaimed: 'daily_bonus_claimed',
  friendAdded: 'friend_added',
  friendRequestAccepted: 'friend_request_accepted',
  notificationViewed: 'notification_viewed',
  resultShared: 'result_shared',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
