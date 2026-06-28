import { useSignIn } from '@clerk/expo/legacy';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { TextField } from '@/components/ui/TextField';

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
        router.replace('/home');
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
          <Text className="font-display text-3xl text-white">Se connecter</Text>

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

          {error ? <Text className="font-ui text-sm text-red">{error}</Text> : null}

          <Button label="Connexion" onPress={onSignIn} loading={loading} />

          <Divider />
          <SocialAuth />

          <Link href="/sign-up" className="text-center font-ui text-sm text-muted">
            Pas de compte ? Créer un compte
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
