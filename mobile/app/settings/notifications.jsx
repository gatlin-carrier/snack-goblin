import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post } from '../../lib/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Settings are stored as flat allowlisted keys, not a nested ntfy object.
    get('/api/settings').then(d => {
      setUrl(d?.ntfy_url || '');
      setTopic(d?.ntfy_topic || '');
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    await post('/api/settings', { ntfy_url: url, ntfy_topic: topic }).catch(() => {});
    setSaving(false);
    router.back();
  }

  async function test() {
    setTesting(true);
    try {
      await post('/api/notify/test', {});
      Alert.alert('sent!', 'check your ntfy app.');
    } catch (e) {
      Alert.alert('failed', e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>notifications</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <View style={{ padding: 16, gap: 16 }}>
        <Text style={{ color: '#7A6150', fontSize: 14, lineHeight: 20 }}>
          push alerts via ntfy.sh — weekly recipe generation runs sunday at 6 pm CT.
        </Text>

        {[
          { label: 'server url', value: url, onChange: setUrl, placeholder: 'https://ntfy.sh' },
          { label: 'topic', value: topic, onChange: setTopic, placeholder: 'my-goblin-alerts' },
        ].map(f => (
          <View key={f.label} className="gap-2">
            <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">{f.label}</Text>
            <TextInput value={f.value} onChangeText={f.onChange} placeholder={f.placeholder} placeholderTextColor="#9A8374" autoCapitalize="none" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
          </View>
        ))}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity onPress={test} disabled={testing || !url || !topic} style={{ flex: 1, backgroundColor: 'rgba(200,185,165,0.4)', borderRadius: 999, paddingVertical: 13, alignItems: 'center', opacity: !url || !topic ? 0.5 : 1 }}>
            {testing ? <ActivityIndicator size="small" color="#7A6150"/> : <Text style={{ color: '#7A6150', fontWeight: '600' }}>send test</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={save} disabled={saving} style={{ flex: 1, backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
            {saving ? <ActivityIndicator size="small" color="white"/> : <Text style={{ color: 'white', fontWeight: '700' }}>save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
