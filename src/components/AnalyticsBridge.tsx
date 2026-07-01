import { useAuth, useUser } from '@clerk/expo';
import { useEffect, useRef } from 'react';

import { identifyUser, resetAnalytics } from '@/lib/analytics';

// Rattache l'identité PostHog à l'utilisateur Clerk : identify au login, reset au logout.
export function AnalyticsBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const identified = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user && !identified.current) {
      identifyUser(user.id, {
        username: user.username ?? user.fullName ?? undefined,
        email: user.primaryEmailAddress?.emailAddress,
      });
      identified.current = true;
    } else if (!isSignedIn && identified.current) {
      resetAnalytics();
      identified.current = false;
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
