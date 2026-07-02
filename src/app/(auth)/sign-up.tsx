import { useSignUp } from '@clerk/expo/legacy';
import { Ionicons } from '@expo/vector-icons';
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { CodeInput } from '@/components/ui/CodeInput';
import { Divider } from '@/components/ui/Divider';
import { TextField } from '@/components/ui/TextField';
import { EVENTS, track } from '@/lib/analytics';
import { postAuthHref } from '@/store/pendingLeagueStore';

const RESEND_SECONDS = 60;

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        track(EVENTS.userSignedUp, { method: 'email' });
        router.replace(postAuthHref() as never);
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

  // --- Étape vérification du code (fond noir sobre) ---
  if (pending) {
    return (
      <ScreenBackground variant="hero">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
            <View className="px-4 pt-2">
              <Pressable
                onPress={() => setPending(false)}
                className="h-10 w-10 items-center justify-center rounded-[13px] border border-hairline bg-surface"
              >
                <Ionicons name="chevron-back" size={22} color="#ffffff" />
              </Pressable>
            </View>

            <View className="flex-1 justify-center gap-6 px-8">
              <View className="items-center gap-2">
                <Text className="text-center font-display text-3xl text-white">
                  Vérifie tes mails
                </Text>
                <Text
                  className="text-center font-ui-medium text-[13px] text-muted"
                  style={{ lineHeight: 20 }}
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
                <Text className="text-center font-ui-semibold text-[12px] text-red">
                  {error}
                </Text>
              ) : null}

              {seconds > 0 ? (
                <View className="flex-row items-center justify-center">
                  <Text className="font-ui-medium text-[13px] text-muted">Renvoyer dans </Text>
                  <Text className="font-ui-semibold text-[13px] text-white">{mmss}</Text>
                </View>
              ) : (
                <Pressable onPress={onResend} className="items-center">
                  <Text className="font-ui-semibold text-[13px] text-white underline">Renvoyer le code</Text>
                </Pressable>
              )}
            </View>

            <View className="px-6 pb-11">
              <BrutalButton
                label="Valider"
                variant="primary"
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
          <View className="gap-1">
            <Text className="font-display text-3xl text-white">Créer un compte</Text>
            <Text className="font-ui-medium text-[13px] text-muted">
              500 jetons offerts à l'inscription.
            </Text>
          </View>

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

          {error ? (
            <Text className="font-ui-semibold text-[12px] text-red">{error}</Text>
          ) : null}
          <BrutalButton label="S'inscrire" variant="primary" onPress={onSignUp} loading={loading} />

          <Divider />
          <SocialAuth />

          <Link href="/sign-in" className="text-center">
            <Text className="font-ui-medium text-[13px] text-muted">
              Déjà un compte ?{' '}
              <Text className="font-ui-semibold text-white underline">Se connecter</Text>
            </Text>
          </Link>

          {/* Point de montage Smart CAPTCHA Clerk (devient <div id="clerk-captcha"> sur web) */}
          <View nativeID="clerk-captcha" />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
