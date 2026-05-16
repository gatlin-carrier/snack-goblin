import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../lib/auth';
import { GoblinWidget } from '../components/Goblin';

function GoogleG({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  );
}

export default function LoginScreen() {
  const { signInWithMagicLink, signInWithProvider, signInWithApple, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleMagicLink() {
    if (busy || cooldown || !email.trim()) return;
    setBusy(true);
    const ok = await signInWithMagicLink(email.trim().toLowerCase());
    setBusy(false);
    if (ok) { setSent(true); setCooldown(60); }
  }

  return (
    <View className="flex-1 bg-goblin-bg">
      {/* ambient gradient background */}
      <View style={{ position: 'absolute', inset: 0 }} className="bg-goblin-bg"/>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, opacity: 0.5 }}
        className="bg-accent-soft"/>

      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <GoblinWidget
            state="idle"
            size={110}
            showCopy={false}
            lookProgress={Math.min(email.length / 25, 1)}
            smileProgress={Math.min(Math.max(email.length - 5, 0) / 20, 1)}
          />
          <Text style={{ fontStyle: 'italic' }} className="text-3xl font-bold text-goblin-ink mt-3">
            snack goblin
          </Text>
          <Text className="text-goblin-dim text-sm mt-1">meal planning for real life</Text>
        </View>

        {/* Card */}
        <View style={{ borderRadius: 24, overflow: 'hidden' }}>
          <BlurView intensity={50} tint="light">
            <View className="p-6" style={{ backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 24, borderWidth: 0.5, borderColor: 'rgba(200,185,165,0.4)' }}>
              {sent ? (
                <View className="items-center gap-3">
                  <Text className="text-2xl">📬</Text>
                  <Text className="text-goblin-ink font-semibold text-base text-center">
                    check your email
                  </Text>
                  <Text className="text-goblin-dim text-sm text-center">
                    we sent a link to {email}. tap it to sign in.
                  </Text>
                  <TouchableOpacity
                    onPress={handleMagicLink}
                    disabled={!!cooldown}
                    className="mt-2"
                  >
                    <Text className="text-accent text-sm font-semibold">
                      {cooldown ? `resend in ${cooldown}s` : 'resend link'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSent(false)}>
                    <Text className="text-goblin-faint text-xs mt-1">use a different method</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-4">
                  <Text className="text-goblin-ink font-semibold text-base">sign in</Text>

                  {error && (
                    <View className="bg-error/10 rounded-xl p-3">
                      <Text className="text-error text-sm">{error}</Text>
                    </View>
                  )}

                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#9A8374"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleMagicLink}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderRadius: 14,
                      borderWidth: 0.5,
                      borderColor: '#CFC2AE',
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      fontSize: 15,
                      color: '#3B2212',
                    }}
                  />

                  <TouchableOpacity
                    onPress={handleMagicLink}
                    disabled={busy || !email.trim()}
                    style={{
                      backgroundColor: '#D4703A',
                      borderRadius: 999,
                      paddingVertical: 13,
                      alignItems: 'center',
                      opacity: busy || !email.trim() ? 0.6 : 1,
                    }}
                  >
                    {busy ? (
                      <ActivityIndicator color="white" size="small"/>
                    ) : (
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                        send magic link
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, height: 0.5, backgroundColor: '#CFC2AE' }}/>
                    <Text className="text-goblin-faint text-xs">or</Text>
                    <View style={{ flex: 1, height: 0.5, backgroundColor: '#CFC2AE' }}/>
                  </View>

                  <TouchableOpacity
                    onPress={() => signInWithProvider('google')}
                    style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999, paddingVertical: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#CFC2AE', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  >
                    <GoogleG size={18}/>
                    <Text style={{ color: '#3B2212', fontWeight: '600', fontSize: 14 }}>continue with Google</Text>
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={999}
                      style={{ height: 44 }}
                      onPress={signInWithApple}
                    />
                  )}
                </View>
              )}
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
