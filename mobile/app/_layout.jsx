import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { PrefsProvider, usePrefs } from '../lib/prefs';
import { useRouter, useSegments } from 'expo-router';

function AuthGate() {
  const { session, loading } = useAuth();
  const { prefs, loaded } = usePrefs();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // Not signed in → login (unless already on login/onboarding).
    if (!session) {
      if (segments[0] !== 'login') router.replace('/login');
      return;
    }

    // Signed in but prefs haven't loaded yet — wait so we don't bounce to
    // onboarding on a stale default before the real value arrives.
    if (!loaded) return;

    // Signed in + onboarding not done → onboarding (unless already there).
    if (!prefs.onboarding_complete) {
      if (segments[0] !== 'onboarding') router.replace('/onboarding');
      return;
    }

    // Fully onboarded but stuck on login/onboarding → home.
    if (segments[0] === 'login' || segments[0] === 'onboarding') {
      router.replace('/(tabs)');
    }
  }, [session, loading, loaded, prefs.onboarding_complete, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PrefsProvider>
          <AuthGate/>
          <StatusBar style="dark"/>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login"/>
            <Stack.Screen name="onboarding"/>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }}/>
            <Stack.Screen name="recipe/[id]" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal', headerShown: false }}/>
            <Stack.Screen name="settings/llm" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/household" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/child-profile" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/adult-goals" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/goblin" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/notifications" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/pantry" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/allergens" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/integrations" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/drinks" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/collections" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/history" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/first-foods" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="settings/generate" options={{ presentation: 'modal', headerShown: false }}/>
            <Stack.Screen name="chat" options={{ presentation: 'modal', headerShown: false }}/>
          </Stack>
        </PrefsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
