import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { post } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import { GoblinWidget } from '../components/Goblin';

const CUISINES = ['Mexican','Italian','Indian','Thai','Japanese','Greek','Middle Eastern','American'];
const COMFORT_TYPES = [
  { id: 'pasta',   label: '🍝 pasta' },
  { id: 'rice',    label: '🍚 rice bowls' },
  { id: 'sandwich',label: '🥪 sandwiches' },
  { id: 'soup',    label: '🍲 soup' },
  { id: 'one-pan', label: '🍳 one-pan' },
  { id: 'breakfast-for-dinner', label: '🥞 breakfast for dinner' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { update } = usePrefs();
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState('mid');
  const [excludedCuisines, setExcludedCuisines] = useState([]);
  const [comfortMeal, setComfortMeal] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState([]);

  function toggleCuisine(c) {
    setExcludedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function addMember() {
    if (!memberEmail.trim()) return;
    setMembers(m => [...m, { email: memberEmail.trim(), name: memberName.trim() }]);
    setMemberEmail(''); setMemberName('');
  }

  async function finish() {
    try {
      // /api/preferences takes one {type, name, preference} per cuisine.
      for (const c of excludedCuisines) {
        await post('/api/preferences', { type: 'cuisine', name: c, preference: 'excluded' });
      }
      // /api/household/invite-bulk wants { invites: [{ email, display_name }] }.
      if (members.length) {
        await post('/api/household/invite-bulk', {
          invites: members.map(m => ({ email: m.email, display_name: m.name })),
        });
      }
      // comfort_meal_type isn't a cuisine/ingredient — it lives in user-prefs.
      await update({ energy_level: energy, onboarding_complete: true, excluded_cuisines: excludedCuisines, comfort_meal_type: comfortMeal });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('hmm, that didn’t save', e.message || 'something went wrong. try again?');
    }
  }

  const steps = [
    // Step 0: Energy
    <View key="energy" className="gap-5">
      <GoblinWidget state="curious" size={60}/>
      <Text className="text-2xl font-bold text-goblin-ink text-center">how much energy do you usually have?</Text>
      <Text className="text-goblin-dim text-center text-sm">we'll adjust how complex our suggestions are.</Text>
      {[
        { id: 'low',  label: 'low', desc: 'simple, few ingredients, minimal effort' },
        { id: 'mid',  label: 'mid', desc: 'balanced — most nights are fine' },
        { id: 'high', label: 'high', desc: 'bring it on, I like to cook' },
      ].map(e => (
        <TouchableOpacity
          key={e.id}
          onPress={() => setEnergy(e.id)}
          style={{
            borderRadius: 18, padding: 16, borderWidth: 2,
            borderColor: energy === e.id ? '#D4703A' : '#CFC2AE',
            backgroundColor: energy === e.id ? 'rgba(212,112,58,0.08)' : 'rgba(255,255,255,0.5)',
          }}
        >
          <Text className="text-goblin-ink font-semibold text-base">{e.label}</Text>
          <Text className="text-goblin-dim text-sm mt-1">{e.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>,

    // Step 1: Household
    <View key="household" className="gap-4">
      <Text className="text-2xl font-bold text-goblin-ink text-center">who else is eating?</Text>
      <Text className="text-goblin-dim text-center text-sm">invite household members (optional — skip if it's just you).</Text>
      <View className="gap-3">
        <TextInput
          value={memberEmail}
          onChangeText={setMemberEmail}
          placeholder="email@example.com"
          placeholderTextColor="#9A8374"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}
        />
        <TextInput
          value={memberName}
          onChangeText={setMemberName}
          placeholder="name (optional)"
          placeholderTextColor="#9A8374"
          style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}
        />
        <TouchableOpacity onPress={addMember} style={{ backgroundColor: 'rgba(212,112,58,0.12)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ color: '#D4703A', fontWeight: '600' }}>+ add member</Text>
        </TouchableOpacity>
      </View>
      {members.map((m, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 10 }}>
          <Text style={{ flex: 1, color: '#3B2212', fontSize: 14 }}>{m.name || m.email}</Text>
          <TouchableOpacity onPress={() => setMembers(prev => prev.filter((_, j) => j !== i))}>
            <Text style={{ color: '#7A6150', fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>,

    // Step 2: Cuisines
    <View key="cuisines" className="gap-5">
      <Text className="text-2xl font-bold text-goblin-ink text-center">anything you'd rather skip?</Text>
      <Text className="text-goblin-dim text-center text-sm">tap the cuisines you'd like to avoid.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CUISINES.map(c => {
          const excluded = excludedCuisines.includes(c);
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toggleCuisine(c)}
              style={{
                borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
                backgroundColor: excluded ? 'rgba(158,78,40,0.15)' : 'rgba(255,255,255,0.6)',
                borderWidth: 1, borderColor: excluded ? '#9E4E28' : '#CFC2AE',
              }}
            >
              <Text style={{ color: excluded ? '#9E4E28' : '#4E3322', fontWeight: '600', fontSize: 13 }}>
                {excluded ? '✕ ' : ''}{c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,

    // Step 3: Comfort meal
    <View key="comfort" className="gap-5">
      <Text className="text-2xl font-bold text-goblin-ink text-center">what's your comfort meal?</Text>
      <Text className="text-goblin-dim text-center text-sm">when everything's too much, what do you reach for?</Text>
      <View className="gap-3">
        {COMFORT_TYPES.map(c => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setComfortMeal(c.id)}
            style={{
              borderRadius: 16, padding: 14, borderWidth: 2,
              borderColor: comfortMeal === c.id ? '#D4703A' : '#CFC2AE',
              backgroundColor: comfortMeal === c.id ? 'rgba(212,112,58,0.08)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Text style={{ color: '#3B2212', fontWeight: '600', fontSize: 15 }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,

    // Step 4: Done
    <View key="done" className="gap-5 items-center">
      <GoblinWidget state="well-fed" size={80}/>
      <Text className="text-2xl font-bold text-goblin-ink text-center">you're all set.</Text>
      <Text className="text-goblin-dim text-center">the goblin will generate your first week of meals in the background. check back in a minute.</Text>
    </View>,
  ];

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 48, paddingBottom: 80 }}>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <View key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 999, backgroundColor: i <= step ? '#D4703A' : '#CFC2AE' }}/>
          ))}
        </View>

        {steps[step]}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 }}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep(s => s - 1)} style={{ paddingVertical: 12, paddingHorizontal: 20 }}>
              <Text style={{ color: '#7A6150', fontWeight: '600' }}>back</Text>
            </TouchableOpacity>
          ) : <View/>}
          <TouchableOpacity
            onPress={() => step < steps.length - 1 ? setStep(s => s + 1) : finish()}
            style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 28 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
              {step < steps.length - 1 ? 'next' : "let's go"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
