import { useSignUp } from '@clerk/expo/legacy';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { Divider } from '@/components/ui/Divider';
import { TextField } from '@/components/ui/TextField';

const RESEND_SECONDS = 60;

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!pending || seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [pending, seconds]);

  const onSignUp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password, firstName, lastName });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPending(true);
      setSeconds(RESEND_SECONDS);
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (codeValue?: string) => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: codeValue ?? code });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        router.replace('/home');
      } else {
        setError('Code incorrect.');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!isLoaded || seconds > 0) return;
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setSeconds(RESEND_SECONDS);
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Renvoi impossible.');
    }
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  // --- Étape vérification du code (fond vert, comme « Prono Result ») ---
  if (pending) {
    return (
      <ScreenBackground variant="success">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 pt-14">
            <View className="px-4 pt-2">
              <Pressable
                onPress={() => setPending(false)}
                className="h-9 w-9 items-center justify-center rounded-full"
              >
                <Text className="text-3xl leading-none text-white">‹</Text>
              </Pressable>
            </View>

            <View className="flex-1 justify-center gap-6 px-8">
              <View className="items-center gap-2">
                <Text className="text-center font-display text-3xl text-white">
                  Vérifie tes mails
                </Text>
                <Text
                  className="text-center font-ui text-base text-muted"
                  style={{ lineHeight: 22 }}
                >
                  {"On t'a envoyé un code à 6 chiffres à "}{email}
                </Text>
              </View>

              <CodeInput
                value={code}
                onChangeText={setCode}
                length={6}
                onComplete={(c) => onVerify(c)}
              />

              {error ? (
                <Text className="text-center font-ui text-sm text-red">{error}</Text>
              ) : null}

              {seconds > 0 ? (
                <View className="flex-row items-center justify-center">
                  <Text className="font-ui text-sm text-muted">Renvoyer dans </Text>
                  <Text className="font-ui-bold text-sm text-white">{mmss}</Text>
                </View>
              ) : (
                <Pressable onPress={onResend} className="items-center">
                  <Text className="font-ui-semibold text-sm text-red">Renvoyer le code</Text>
                </Pressable>
              )}
            </View>

            <View className="px-6 pb-11">
              <Button
                label="Valider"
                onPress={() => onVerify()}
                loading={loading}
                disabled={code.length < 6}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenBackground>
    );
  }

  // --- Étape inscription (fond hero) ---
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
          <Text className="font-display text-3xl text-white">Créer un compte</Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Daniel"
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Yao"
              />
            </View>
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
            placeholder="8 caractères minimum"
          />

          {error ? <Text className="font-ui text-sm text-red">{error}</Text> : null}
          <Button label="S'inscrire" onPress={onSignUp} loading={loading} />

          <Divider />
          <SocialAuth />

          <Link href="/sign-in" className="text-center font-ui text-sm text-muted">
            Déjà un compte ? Se connecter
          </Link>

          {/* Point de montage Smart CAPTCHA Clerk (devient <div id="clerk-captcha"> sur web) */}
          <View nativeID="clerk-captcha" />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
