import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { PrefsProvider } from '../lib/prefs';
import { useRouter, useSegments } from 'expo-router';

function AuthGate() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'login' || segments[0] === 'onboarding';
    if (!session && !inAuth) router.replace('/login');
    if (session && segments[0] === 'login') router.replace('/(tabs)');
  }, [session, loading, segments]);

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
