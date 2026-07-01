import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';

import { postAuthHref } from '@/store/pendingLeagueStore';

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect href={postAuthHref() as never} />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A1230' },
      }}
    />
  );
}
