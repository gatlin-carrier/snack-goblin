import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PasskeysScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>passkeys / face id</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 40 }}>🔑</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B2212', textAlign: 'center' }}>coming soon</Text>
        <Text style={{ color: '#7A6150', textAlign: 'center', lineHeight: 22 }}>
          native passkey / Face ID support requires a separate native module (react-native-passkeys).
          for now, sign in via magic link — your session stays active on this device.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 13 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>got it</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
