import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post, put, del } from '../../lib/api';
import { GlassPill } from '../../components/GlassPill';

const PROVIDERS = ['anthropic','openai','google','groq','ollama','lmstudio','custom'];

function ModalHeader({ title, onClose }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
      <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>{title}</Text>
      <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
    </View>
  );
}

export default function LLMSettingsScreen() {
  const router = useRouter();
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ provider: 'anthropic', model: '', api_key: '', label: '' });
  const [testing, setTesting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/api/llm-configs').then(setConfigs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (editing) {
      const updated = await put(`/api/llm-configs/${editing}`, form).catch(() => null);
      if (updated) setConfigs(c => c.map(x => x.id === editing ? updated : x));
    } else {
      const created = await post('/api/llm-configs', form).catch(() => null);
      if (created) setConfigs(c => [...c, created]);
    }
    setEditing(null); setForm({ provider: 'anthropic', model: '', api_key: '', label: '' });
  }

  async function activate(id) {
    await post(`/api/llm-configs/${id}/activate`, {}).catch(() => {});
    setConfigs(c => c.map(x => ({ ...x, is_active: x.id === id })));
  }

  async function testConfig(id) {
    setTesting(id);
    try {
      const res = await post(`/api/llm-configs/${id}/test`, {});
      Alert.alert('connection ok', res.message || 'model responded successfully.');
    } catch (e) {
      Alert.alert('test failed', e.message);
    } finally {
      setTesting(null);
    }
  }

  async function remove(id) {
    await del(`/api/llm-configs/${id}`).catch(() => {});
    setConfigs(c => c.filter(x => x.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <ModalHeader title="ai model" onClose={() => router.back()}/>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}>

        {/* Existing configs */}
        {configs.map(cfg => (
          <View key={cfg.id} style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: 14, borderWidth: cfg.is_active ? 2 : 0.5, borderColor: cfg.is_active ? '#D4703A' : '#CFC2AE' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ flex: 1, fontWeight: '700', color: '#3B2212', fontSize: 15 }}>{cfg.label || cfg.provider}</Text>
              {cfg.is_active && <View style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>ACTIVE</Text></View>}
            </View>
            <Text style={{ color: '#7A6150', fontSize: 13 }}>{cfg.provider} · {cfg.model || 'default'}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {!cfg.is_active && <TouchableOpacity onPress={() => activate(cfg.id)} style={{ flex: 1, backgroundColor: 'rgba(212,112,58,0.12)', borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}><Text style={{ color: '#D4703A', fontWeight: '600', fontSize: 13 }}>activate</Text></TouchableOpacity>}
              <TouchableOpacity onPress={() => testConfig(cfg.id)} disabled={!!testing} style={{ flex: 1, backgroundColor: 'rgba(200,185,165,0.35)', borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}>
                {testing === cfg.id ? <ActivityIndicator size="small" color="#7A6150"/> : <Text style={{ color: '#7A6150', fontWeight: '600', fontSize: 13 }}>test</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditing(cfg.id); setForm(cfg); }} style={{ flex: 1, backgroundColor: 'rgba(200,185,165,0.35)', borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}><Text style={{ color: '#7A6150', fontWeight: '600', fontSize: 13 }}>edit</Text></TouchableOpacity>
              {!cfg.is_active && <TouchableOpacity onPress={() => remove(cfg.id)} style={{ backgroundColor: 'rgba(188,56,56,0.10)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' }}><Text style={{ color: '#BC3838', fontWeight: '600', fontSize: 13 }}>×</Text></TouchableOpacity>}
            </View>
          </View>
        ))}

        {/* Add / edit form */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#3B2212', marginTop: 8 }}>{editing ? 'edit config' : 'add config'}</Text>

        <TextInput value={form.label} onChangeText={v => setForm(f => ({...f, label: v}))} placeholder="label (eg. claude fast)" placeholderTextColor="#9A8374" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PROVIDERS.map(p => <GlassPill key={p} active={form.provider === p} onPress={() => setForm(f => ({...f, provider: p}))}>{p}</GlassPill>)}
        </View>

        <TextInput value={form.api_key} onChangeText={v => setForm(f => ({...f, api_key: v}))} placeholder="api key" placeholderTextColor="#9A8374" secureTextEntry style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>

        <TextInput value={form.model} onChangeText={v => setForm(f => ({...f, model: v}))} placeholder="model (leave blank for default)" placeholderTextColor="#9A8374" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editing && <TouchableOpacity onPress={() => { setEditing(null); setForm({ provider: 'anthropic', model: '', api_key: '', label: '' }); }} style={{ flex: 1, backgroundColor: 'rgba(200,185,165,0.4)', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}><Text style={{ color: '#7A6150', fontWeight: '600' }}>cancel</Text></TouchableOpacity>}
          <TouchableOpacity onPress={save} style={{ flex: 1, backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>{editing ? 'update' : 'add'}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
