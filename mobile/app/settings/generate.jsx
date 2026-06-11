import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get } from '../../lib/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MODES = [
  { id: 'batch',   label: '🥘 batch prep',        desc: 'make-ahead, reheatable' },
  { id: 'quick',   label: '⚡ quick',               desc: '< 30 min total' },
  { id: 'adhd',    label: '🧠 adhd-friendly',      desc: 'minimal decisions, low steps' },
];

const DEFAULT_COUNTS = { breakfast: 2, lunch: 2, dinner: 3, snack: 2 };

export default function GenerateScreen() {
  const router = useRouter();
  const [mode, setMode] = useState('adhd');
  const [counts, setCounts] = useState({ ...DEFAULT_COUNTS });
  const [status, setStatus] = useState({}); // { breakfast: 'generating' | 'done' | 'error' }
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState({});

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const estimatedMin = Math.ceil(total * 0.8);

  function setCount(type, delta) {
    setCounts(c => ({ ...c, [type]: Math.max(0, Math.min(6, (c[type] || 0) + delta)) }));
  }

  async function generate() {
    setGenerating(true);
    setDone(false);
    setStatus({});
    setResults({});

    const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3710';
    const { currentToken } = await import('../../lib/auth');

    // The backend expects per-meal-type counts in one request and streams
    // progress back as Server-Sent Events (text/event-stream). React Native's
    // fetch has no reliable streaming reader, so we await the full body and
    // parse the buffered `data:` lines once the stream closes. This means
    // progress arrives all at once rather than live — acceptable here since
    // generation is quick and the per-type result is still shown. The pre-flight
    // sets every requested type to 'generating' so the UI isn't blank meanwhile.
    const requested = MEAL_TYPES.filter(t => counts[t] > 0);
    setStatus(Object.fromEntries(requested.map(t => [t, 'generating'])));

    try {
      const res = await fetch(`${BASE}/api/recipes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          breakfast: counts.breakfast || 0,
          lunch: counts.lunch || 0,
          dinner: counts.dinner || 0,
          snack: counts.snack || 0,
          mode,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Do NOT call res.json() — the body is an SSE stream. Read it as text and
      // parse each `data: {…}` event line.
      const raw = await res.text();
      const nextStatus = {};
      const nextResults = {};
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        let evt;
        try { evt = JSON.parse(trimmed.slice(5).trim()); } catch { continue; }
        if (evt.type === 'done') {
          nextStatus[evt.mealType] = 'done';
          nextResults[evt.mealType] = evt.generated;
        } else if (evt.type === 'error') {
          nextStatus[evt.mealType] = 'error';
        }
      }
      // Any requested type we never saw a terminal event for is treated as done
      // if the overall stream completed without error.
      setStatus(s => {
        const merged = { ...s, ...nextStatus };
        for (const t of requested) if (!merged[t] || merged[t] === 'generating') merged[t] = 'done';
        return merged;
      });
      setResults(r => ({ ...r, ...nextResults }));
    } catch {
      setStatus(Object.fromEntries(requested.map(t => [t, 'error'])));
    }

    setGenerating(false);
    setDone(true);
  }

  const STATUS_ICON = { generating: '⏳', done: '✓', error: '✕', pending: '○' };
  const STATUS_COLOR = { generating: '#C09E38', done: '#6A9870', error: '#BC3838', pending: '#CFC2AE' };

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>generate recipes</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 80 }}>

        {/* Mode */}
        <View className="gap-3">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">style</Text>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setMode(m.id)}
              style={{
                borderRadius: 16, padding: 14, borderWidth: 2,
                borderColor: mode === m.id ? '#D4703A' : '#CFC2AE',
                backgroundColor: mode === m.id ? 'rgba(212,112,58,0.08)' : 'rgba(255,255,255,0.5)',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#3B2212' }}>{m.label}</Text>
              <Text style={{ fontSize: 12, color: '#7A6150', marginTop: 2 }}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Counts */}
        <View className="gap-3">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">how many to generate</Text>
          {MEAL_TYPES.map(type => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14, padding: 12 }}>
              <Text style={{ flex: 1, color: '#3B2212', fontSize: 15, fontWeight: '500', textTransform: 'capitalize' }}>{type}</Text>

              {/* Progress indicator when generating */}
              {status[type] && (
                <Text style={{ marginRight: 12, fontSize: 14, color: STATUS_COLOR[status[type]] || '#CFC2AE' }}>
                  {status[type] === 'generating'
                    ? <ActivityIndicator size="small" color={STATUS_COLOR.generating}/>
                    : STATUS_ICON[status[type]]}
                </Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setCount(type, -1)} disabled={generating} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(200,185,165,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#7A6150', fontSize: 18, lineHeight: 22 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B2212', width: 24, textAlign: 'center' }}>{counts[type]}</Text>
                <TouchableOpacity onPress={() => setCount(type, 1)} disabled={generating} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(200,185,165,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#7A6150', fontSize: 18, lineHeight: 22 }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <Text style={{ color: '#9A8374', fontSize: 12, textAlign: 'right' }}>
            {total} recipes · ~{estimatedMin} min
          </Text>
        </View>

        {/* Done summary */}
        {done && (
          <View style={{ backgroundColor: 'rgba(106,152,112,0.12)', borderRadius: 18, padding: 16, gap: 8 }}>
            <Text style={{ fontWeight: '700', color: '#3A6B50', fontSize: 15, marginBottom: 4 }}>generation complete</Text>
            {MEAL_TYPES.filter(t => counts[t] > 0).map(t => (
              <View key={t} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#3B2212', fontSize: 14, textTransform: 'capitalize' }}>{t}</Text>
                <Text style={{ color: status[t] === 'done' ? '#3A6B50' : '#BC3838', fontSize: 14, fontWeight: '600' }}>
                  {status[t] === 'done' ? `${results[t] || counts[t]} added` : 'failed'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={done ? () => router.replace('/(tabs)/recipes') : generate}
          disabled={generating || total === 0}
          style={{
            backgroundColor: done ? '#6A9870' : '#D4703A',
            borderRadius: 999, paddingVertical: 14, alignItems: 'center',
            opacity: generating || total === 0 ? 0.6 : 1,
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          {generating && <ActivityIndicator size="small" color="white"/>}
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
            {done ? 'see recipes →' : generating ? 'generating…' : `generate ${total} recipes`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
