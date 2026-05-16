import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { get, post, del } from '../../lib/api';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];
const MEAL_EMOJI = { breakfast:'☀️', lunch:'🌤', dinner:'🍽', snack:'🍎' };
const MEAL_COLORS = { breakfast:'#C09E38', lunch:'#6A9870', dinner:'#D4703A', snack:'#6A3068' };

export default function PlanScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [curating, setCurating] = useState(false);

  async function load() {
    try {
      const data = await get('/api/meal-plans/current');
      setPlan(data);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  async function autocurate() {
    if (!plan?.id) return;
    setCurating(true);
    try {
      await post(`/api/meal-plans/${plan.id}/auto-curate`, { strategy: 'top-rated', days: 7 });
      await load();
    } finally {
      setCurating(false);
    }
  }

  async function removeItem(itemId) {
    if (!plan?.id) return;
    await del(`/api/meal-plans/${plan.id}/items/${itemId}`).catch(() => {});
    setPlan(p => ({ ...p, items: p.items.filter(i => i.id !== itemId) }));
  }

  async function createPlan() {
    const monday = getMonday();
    const data = await post('/api/meal-plans', { week_start: monday }).catch(() => null);
    if (data) { setPlan(data); }
  }

  function getMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#D4703A"/>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center px-8" edges={['top']}>
        <Text className="text-5xl mb-4">📅</Text>
        <Text className="text-goblin-ink text-xl font-bold text-center mb-2">no plan yet</Text>
        <Text className="text-goblin-dim text-center mb-6">create a plan for this week and start adding meals.</Text>
        <TouchableOpacity onPress={createPlan} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 13 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>create this week's plan</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const items = plan.items || [];
  const today = new Date().getDay();

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4703A"/>}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-goblin-ink">this week</Text>
          <TouchableOpacity
            onPress={autocurate}
            disabled={curating}
            style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' }}
          >
            {curating ? <ActivityIndicator size="small" color="white"/> : null}
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>auto-fill</Text>
          </TouchableOpacity>
        </View>

        {/* Day cards */}
        {DAYS.map((day, dow) => {
          const dayItems = items.filter(i => i.day_of_week === dow);
          const isToday = dow === today;
          return (
            <View key={dow} className="mx-4 mb-3">
              <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: isToday ? 2 : 0.5, borderColor: isToday ? '#D4703A' : '#CFC2AE' }}>
                <BlurView intensity={35} tint="light">
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.42)', borderRadius: 20 }}>
                    {/* Day header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isToday ? '#D4703A' : '#3B2212' }}>{day}</Text>
                      {isToday && <View style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>TODAY</Text></View>}
                      <Text style={{ color: '#9A8374', fontSize: 13 }}>{dayItems.length} meal{dayItems.length !== 1 ? 's' : ''}</Text>
                    </View>

                    {/* Meal slots */}
                    {MEAL_TYPES.map(type => {
                      const meal = dayItems.find(i => i.meal_type === type);
                      return (
                        <View key={type} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 0.5, borderTopColor: 'rgba(200,185,165,0.3)' }}>
                          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: MEAL_COLORS[type] + '20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Text style={{ fontSize: 13 }}>{MEAL_EMOJI[type]}</Text>
                          </View>
                          <Text style={{ width: 64, fontSize: 11, color: '#7A6150', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{type}</Text>
                          {meal ? (
                            <>
                              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/recipe/${meal.recipe_id}`)}>
                                <Text style={{ fontSize: 14, color: '#3B2212', fontWeight: '500' }} numberOfLines={1}>{meal.recipe_name || meal.name}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => removeItem(meal.id)} style={{ padding: 6 }}>
                                <Text style={{ color: '#9A8374', fontSize: 16 }}>×</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/recipes')}>
                              <Text style={{ fontSize: 13, color: '#CFC2AE' }}>+ add meal</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </BlurView>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
