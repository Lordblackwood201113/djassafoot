import { useSignIn } from '@clerk/expo/legacy';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { Divider } from '@/components/ui/Divider';
import { TextField } from '@/components/ui/TextField';
import { EVENTS, track } from '@/lib/analytics';
import { postAuthHref } from '@/store/pendingLeagueStore';

export default function SignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await signIn.create({ identifier: email, password });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        track(EVENTS.userSignedIn, { method: 'email' });
        router.replace(postAuthHref() as never);
      } else {
        setError('Connexion incomplète.');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="hero">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-1">
            <Text className="font-display text-3xl text-white">Se connecter</Text>
            <Text className="font-ui-medium text-[13px] text-muted">
              Retrouve tes pronos et tes jetons.
            </Text>
          </View>

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="toi@exemple.com"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error ? (
            <Text className="font-ui-semibold text-[12px] text-red">{error}</Text>
          ) : null}

          <BrutalButton label="Connexion" variant="primary" onPress={onSignIn} loading={loading} />

          <Divider />
          <SocialAuth />

          <Link href="/sign-up" className="text-center">
            <Text className="font-ui-medium text-[13px] text-muted">
              Pas de compte ?{' '}
              <Text className="font-ui-semibold text-white underline">Créer un compte</Text>
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
