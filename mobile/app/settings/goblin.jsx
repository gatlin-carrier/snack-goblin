import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePrefs } from '../../lib/prefs';
import { GoblinWidget } from '../../components/Goblin';

export default function GoblinSettingsScreen() {
  const router = useRouter();
  const { prefs, update } = usePrefs();
  const [name, setName] = useState('');

  useEffect(() => { setName(prefs.goblin_name || ''); }, [prefs.goblin_name]);

  async function save() {
    const cleaned = name.trim().slice(0, 24);
    if (!/^[a-zA-Z0-9 '\-]*$/.test(cleaned)) return;
    await update({ goblin_name: cleaned || null });
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>goblin settings</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <View style={{ padding: 24, gap: 24, alignItems: 'center' }}>
        <GoblinWidget state="idle" size={80}/>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#3B2212' }}>{name || 'the goblin'}</Text>

        <View style={{ width: '100%', gap: 8 }}>
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">name your goblin (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gerald"
            placeholderTextColor="#9A8374"
            maxLength={24}
            style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#3B2212', width: '100%' }}
          />
          <Text style={{ fontSize: 11, color: '#9A8374' }}>letters, spaces, hyphens, apostrophes only</Text>
        </View>

        <TouchableOpacity onPress={save} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 40, alignItems: 'center', width: '100%' }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
