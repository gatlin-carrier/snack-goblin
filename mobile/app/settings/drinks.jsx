import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, put } from '../../lib/api';
import { GlassPill } from '../../components/GlassPill';

const MILK_TYPES = ['whole','soy','almond','oat'];

export default function DrinksScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState({ milk_type: 'whole', daily_milk_oz: '', daily_juice_oz: '', logger_enabled: false });

  useEffect(() => {
    get('/api/drinks/settings').then(d => {
      if (d) setSettings({ milk_type: d.milk_type || 'whole', daily_milk_oz: d.daily_milk_oz?.toString() || '', daily_juice_oz: d.daily_juice_oz?.toString() || '', logger_enabled: d.logger_enabled || false });
    }).catch(() => {});
  }, []);

  async function save() {
    await put('/api/drinks/settings', { ...settings, daily_milk_oz: parseFloat(settings.daily_milk_oz) || null, daily_juice_oz: parseFloat(settings.daily_juice_oz) || null }).catch(() => {});
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>drink settings</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>
        <View className="gap-3">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">milk type</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {MILK_TYPES.map(t => <GlassPill key={t} active={settings.milk_type === t} onPress={() => setSettings(s => ({...s, milk_type: t}))}>{t}</GlassPill>)}
          </View>
        </View>

        {[
          { key: 'daily_milk_oz', label: 'daily milk (oz)', placeholder: '16', warn: null },
          { key: 'daily_juice_oz', label: 'daily juice (oz)', placeholder: '4', warn: parseFloat(settings.daily_juice_oz) > 6 ? 'AAP recommends max 6 oz/day for toddlers.' : null },
        ].map(f => (
          <View key={f.key} className="gap-2">
            <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">{f.label}</Text>
            <TextInput value={settings[f.key]} onChangeText={v => setSettings(s => ({...s, [f.key]: v}))} placeholder={f.placeholder} placeholderTextColor="#9A8374" keyboardType="numeric" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
            {f.warn && <Text style={{ color: '#BC3838', fontSize: 12 }}>{f.warn}</Text>}
          </View>
        ))}

        <TouchableOpacity onPress={() => setSettings(s => ({...s, logger_enabled: !s.logger_enabled}))} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14, padding: 14, gap: 12 }}>
          <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: settings.logger_enabled ? '#D4703A' : '#CFC2AE', justifyContent: 'center', padding: 2 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', transform: [{ translateX: settings.logger_enabled ? 18 : 0 }] }}/>
          </View>
          <Text style={{ flex: 1, color: '#3B2212', fontSize: 14, fontWeight: '500' }}>enable daily drink logger</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={save} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
