import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { get, post } from '../../lib/api';

export default function CookModeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [phase, setPhase] = useState('mise'); // 'mise' | 'cook' | 'done'
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState({});
  const [timerSec, setTimerSec] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    get(`/api/recipes/${id}`).then(setRecipe).catch(() => {});
    return () => clearInterval(timerRef.current);
  }, [id]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  function detectTimer(text) {
    const m = text?.match(/(\d+)\s*(?:to\s*\d+\s*)?(?:minute|min)/i);
    return m ? parseInt(m[1]) * 60 : null;
  }

  async function finish() {
    await post(`/api/recipes/${id}/cooked`, { notes: '' }).catch(() => {});
    setPhase('done');
  }

  if (!recipe) return (
    <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center">
      <ActivityIndicator size="large" color="#D4703A"/>
    </SafeAreaView>
  );

  const ingredients = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients || '[]') : recipe.ingredients || [];
  const instructions = typeof recipe.instructions === 'string' ? JSON.parse(recipe.instructions || '[]') : recipe.instructions || [];
  const currentStep = instructions[step];
  const stepText = typeof currentStep === 'string' ? currentStep : currentStep?.step || currentStep?.text || '';
  const detectedTimer = detectTimer(stepText);

  const remainingTimer = timerSec !== null ? Math.max(0, timerSec - elapsed) : null;
  const timerMin = remainingTimer !== null ? Math.floor(remainingTimer / 60) : null;
  const timerSecDisplay = remainingTimer !== null ? (remainingTimer % 60).toString().padStart(2, '0') : null;

  if (phase === 'done') {
    const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);
    return (
      <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center px-8 gap-5">
        <Text className="text-6xl">🎉</Text>
        <Text className="text-3xl font-bold text-goblin-ink text-center">nice cook!</Text>
        <Text className="text-goblin-dim text-center">you saved ~{totalTime} min of thinking by planning ahead.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 18, color: '#7A6150' }}>×</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#3B2212' }} numberOfLines={1}>{recipe.name}</Text>
        {phase === 'cook' && (
          <Text style={{ fontSize: 13, color: '#7A6150' }}>step {step + 1}/{instructions.length}</Text>
        )}
      </View>

      {/* Phase toggle */}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        {['mise','cook'].map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setPhase(p)}
            style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: 'center', backgroundColor: phase === p ? '#D4703A' : 'rgba(255,255,255,0.6)', borderWidth: 0.5, borderColor: phase === p ? '#D4703A' : '#CFC2AE' }}
          >
            <Text style={{ fontWeight: '700', fontSize: 13, color: phase === p ? 'white' : '#7A6150' }}>
              {p === 'mise' ? 'mise en place' : 'cook'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {phase === 'mise' ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 14, color: '#7A6150', marginBottom: 4 }}>check off ingredients as you gather them:</Text>
          {ingredients.map((ing, i) => {
            const text = typeof ing === 'string' ? ing : `${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ing.ingredient || ''}`.trim();
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: 14, gap: 12 }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: checked[i] ? '#D4703A' : '#CFC2AE', backgroundColor: checked[i] ? '#D4703A' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {checked[i] && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: checked[i] ? '#9A8374' : '#3B2212', textDecorationLine: checked[i] ? 'line-through' : 'none' }}>{text}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => setPhase('cook')}
            style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>start cooking →</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          {/* Progress bar */}
          <View style={{ height: 4, backgroundColor: 'rgba(200,185,165,0.4)', borderRadius: 999, marginBottom: 20, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${((step + 1) / instructions.length) * 100}%`, backgroundColor: '#D4703A', borderRadius: 999 }}/>
          </View>

          {/* Step content */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: '#7A6150', fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.7 }}>step {step + 1}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={{ fontSize: 20, color: '#3B2212', lineHeight: 30 }}>{stepText}</Text>
            </ScrollView>

            {/* Timer */}
            {detectedTimer && (
              <View style={{ backgroundColor: 'rgba(212,112,58,0.08)', borderRadius: 20, padding: 16, marginTop: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, fontWeight: '700', color: remainingTimer === 0 ? '#BC3838' : '#D4703A', fontVariantNumeric: 'tabular-nums' }}>
                  {timerSec === null ? `${Math.floor(detectedTimer/60)}:00` : `${timerMin}:${timerSecDisplay}`}
                </Text>
                {remainingTimer === 0 && <Text style={{ color: '#BC3838', fontWeight: '600', marginTop: 4 }}>time's up!</Text>}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setTimerSec(detectedTimer); setElapsed(0); setTimerRunning(false); }}
                    style={{ backgroundColor: 'rgba(200,185,165,0.4)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ color: '#7A6150', fontWeight: '600' }}>reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { if (timerSec === null) setTimerSec(detectedTimer); setTimerRunning(r => !r); }}
                    style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>{timerRunning ? 'pause' : 'start'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Navigation */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            {step > 0 && (
              <TouchableOpacity
                onPress={() => setStep(s => s - 1)}
                style={{ flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 0.5, borderColor: '#CFC2AE' }}
              >
                <Text style={{ color: '#7A6150', fontWeight: '700' }}>← back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => step < instructions.length - 1 ? setStep(s => s + 1) : finish()}
              style={{ flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center', backgroundColor: '#D4703A' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                {step < instructions.length - 1 ? 'next →' : '✓ done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
