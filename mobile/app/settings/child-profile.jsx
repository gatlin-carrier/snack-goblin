import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post } from '../../lib/api';

function ageMonths(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

export default function ChildProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState({});
  const [dob, setDob] = useState('');

  useEffect(() => {
    get('/api/child-profile').then(d => { setProfile(d || {}); setDob(d?.date_of_birth || ''); }).catch(() => {});
  }, []);

  async function save() {
    await post('/api/child-profile', { ...profile, date_of_birth: dob || null }).catch(() => {});
    router.back();
  }

  const months = ageMonths(dob);
  const ageLabel = months === null ? null : months < 24 ? `${months} months` : `${Math.floor(months/12)} years, ${months%12} months`;

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>child profile</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>
        <View className="gap-2">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">date of birth (YYYY-MM-DD)</Text>
          <TextInput value={dob} onChangeText={setDob} placeholder="2023-06-15" placeholderTextColor="#9A8374" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
          {ageLabel && <Text className="text-goblin-dim text-sm">{ageLabel}</Text>}
        </View>

        {months !== null && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: 16, gap: 8 }}>
            <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase mb-2">
              approximate RDAs for {months < 24 ? 'under 2' : months < 48 ? '2–4 years' : '4+ years'}
            </Text>
            {[
              ['calories', months < 24 ? '~1000 kcal' : months < 48 ? '~1200 kcal' : '~1400 kcal'],
              ['iron', '11 mg'],
              ['calcium', months < 24 ? '260 mg' : '700 mg'],
              ['vitamin D', '600 IU'],
              ['DHA', '70–100 mg'],
              ['sodium', '< 1000 mg'],
            ].map(([label, val]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#4E3322', fontSize: 14 }}>{label}</Text>
                <Text style={{ color: '#7A6150', fontSize: 14 }}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={save} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
