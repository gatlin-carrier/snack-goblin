import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { get, post } from '../../lib/api';
import { usePrefs } from '../../lib/prefs';
import { useAuth } from '../../lib/auth';
import { GoblinWidget } from '../../components/Goblin';
import { NutritionBar } from '../../components/NutritionBar';
import { GoblinChat } from '../../components/GoblinChat';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MEAL_COLORS = { breakfast:'#C09E38', lunch:'#6A9870', dinner:'#D4703A', snack:'#6A3068' };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  return 'good evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const { prefs } = usePrefs();
  const [plan, setPlan] = useState(null);
  const [goblinState, setGoblinState] = useState('idle');
  const [leftovers, setLeftovers] = useState([]);
  const [cookStreak, setCookStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  async function load() {
    try {
      const [planData, goblinData, leftoverData, streakData] = await Promise.allSettled([
        get('/api/meal-plans/current'),
        get('/api/goblin-state'),
        get('/api/leftovers'),
        get('/api/batch-streak'),
      ]);
      if (planData.status === 'fulfilled') setPlan(planData.value);
      if (goblinData.status === 'fulfilled') setGoblinState(goblinData.value?.state || 'idle');
      if (leftoverData.status === 'fulfilled') setLeftovers(leftoverData.value || []);
      if (streakData.status === 'fulfilled') setCookStreak(streakData.value?.streak || 0);
    } catch {}
  }

  // Wait for the auth session to resolve before firing API calls — otherwise the
  // dashboard requests race ahead of the bearer token on a cold start and 401.
  useEffect(() => {
    if (loading || !session) return;
    load();
  }, [loading, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const today = new Date();
  const todayDow = today.getDay();

  const todayMeals = plan?.items?.filter(i => i.day_of_week === todayDow) || [];
  const weekItems = plan?.items || [];

  const nutrition = plan?.nutrition || {};
  const nutCalories = nutrition.calories || {};

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4703A"/>}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View>
            <Text className="text-goblin-dim text-xs">{greeting()}</Text>
            <Text className="text-goblin-ink text-2xl font-bold">{user?.user_metadata?.name?.split(' ')[0] || 'there'}</Text>
          </View>
          <TouchableOpacity onPress={() => setChatOpen(true)}>
            <GoblinWidget state={goblinState} size={48} showCopy={false}/>
          </TouchableOpacity>
        </View>

        {/* Today's meals */}
        <View className="px-5 mt-4">
          <Text className="text-goblin-dim text-xs font-semibold tracking-wider mb-3">TODAY</Text>
          {todayMeals.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/plan')}
              style={{ backgroundColor: 'rgba(212,112,58,0.08)', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,112,58,0.20)', borderStyle: 'dashed' }}
            >
              <Text className="text-goblin-dim text-sm">no meals planned today</Text>
              <Text className="text-accent font-semibold text-sm mt-1">tap to build your week →</Text>
            </TouchableOpacity>
          ) : (
            <View className="gap-3">
              {todayMeals.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/recipe/${item.recipe_id}`)}
                  style={{ borderRadius: 18, overflow: 'hidden' }}
                  activeOpacity={0.85}
                >
                  <BlurView intensity={40} tint="light">
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.45)', padding: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: MEAL_COLORS[item.meal_type] || '#D4703A', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>
                          {item.meal_type === 'breakfast' ? '☀️' : item.meal_type === 'lunch' ? '🌤' : item.meal_type === 'snack' ? '🍎' : '🍽'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: '#7A6150', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>{item.meal_type}</Text>
                        <Text style={{ fontSize: 15, color: '#3B2212', fontWeight: '600' }} numberOfLines={1}>{item.recipe_name || item.name}</Text>
                      </View>
                      <Text style={{ color: '#CFC2AE', fontSize: 18 }}>›</Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Week overview */}
        <View className="mt-6 px-5">
          <Text className="text-goblin-dim text-xs font-semibold tracking-wider mb-3">THIS WEEK</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {DAYS.map((day, dow) => {
              const meals = weekItems.filter(i => i.day_of_week === dow);
              const isToday = dow === todayDow;
              return (
                <TouchableOpacity
                  key={dow}
                  onPress={() => router.push('/(tabs)/plan')}
                  style={{
                    width: 70, borderRadius: 18, overflow: 'hidden',
                    borderWidth: isToday ? 2 : 0.5,
                    borderColor: isToday ? '#D4703A' : '#CFC2AE',
                  }}
                >
                  <BlurView intensity={30} tint="light">
                    <View style={{ backgroundColor: isToday ? 'rgba(212,112,58,0.08)' : 'rgba(255,255,255,0.45)', padding: 10, alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: isToday ? '#D4703A' : '#7A6150', fontWeight: '700', textTransform: 'uppercase' }}>{day}</Text>
                      {meals.length > 0 ? (
                        meals.slice(0, 3).map((m, i) => (
                          <View key={i} style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: MEAL_COLORS[m.meal_type] || '#D4703A' }}/>
                        ))
                      ) : (
                        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: '#CFC2AE' }}/>
                      )}
                      <Text style={{ fontSize: 10, color: '#9A8374' }}>{meals.length || 0}</Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Nutrition (collapsed in low-capacity mode) */}
        {!prefs.low_capacity_mode && nutCalories.target > 0 && (
          <View className="mx-5 mt-6 rounded-[22px] overflow-hidden">
            <BlurView intensity={40} tint="light">
              <View style={{ backgroundColor: 'rgba(255,255,255,0.45)', padding: 16, borderRadius: 22 }}>
                <Text className="text-goblin-dim text-xs font-semibold tracking-wider mb-3">NUTRITION THIS WEEK</Text>
                <NutritionBar label="calories" pct={(nutCalories.actual / nutCalories.target) * 100} value={nutCalories.actual} max={nutCalories.target} unit="kcal"/>
              </View>
            </BlurView>
          </View>
        )}

        {/* Leftovers */}
        {leftovers.length > 0 && (
          <View className="mx-5 mt-5">
            <Text className="text-goblin-dim text-xs font-semibold tracking-wider mb-3">USE UP SOON</Text>
            {leftovers.slice(0, 3).map(l => {
              // Parse use_by_date as local noon to avoid a TZ off-by-one day.
              const useBy = l.use_by_date ? new Date(l.use_by_date + 'T12:00:00') : null;
              const daysLeft = useBy
                ? Math.round((useBy - new Date()) / 86400000)
                : null;
              const soon = daysLeft !== null && daysLeft <= 1;
              return (
                <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: 12, marginBottom: 8 }}>
                  <Text style={{ flex: 1, color: '#3B2212', fontSize: 14 }}>{l.recipe_name}</Text>
                  {daysLeft !== null && (
                    <View style={{ backgroundColor: soon ? 'rgba(188,56,56,0.15)' : 'rgba(192,158,56,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: soon ? '#BC3838' : '#7A6000', fontWeight: '600' }}>
                        {daysLeft <= 0 ? 'today' : `${daysLeft}d left`}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Cook streak */}
        {cookStreak > 0 && (
          <View className="mx-5 mt-4">
            <View style={{ backgroundColor: 'rgba(212,112,58,0.10)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🔥</Text>
              <Text style={{ color: '#D4703A', fontWeight: '600', fontSize: 14 }}>{cookStreak} cook day streak — nice.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Goblin Chat Modal */}
      <Modal visible={chatOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setChatOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#F5EDE0' }}>
          <GoblinChat onClose={() => setChatOpen(false)}/>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
