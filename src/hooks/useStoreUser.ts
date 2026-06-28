import { api } from '@convex/_generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect } from 'react';

// Crée l'utilisateur Convex (+ bonus d'inscription) dès que Convex est authentifié.
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (!isAuthenticated) return;
    storeUser().catch(() => {});
  }, [isAuthenticated, storeUser]);
}
