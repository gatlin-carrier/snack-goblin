import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { get, post, patch } from '../../lib/api';
import { RecipeCard } from '../../components/RecipeCard';
import { GlassPill } from '../../components/GlassPill';

const MEAL_TYPES = ['all','breakfast','lunch','dinner','snack'];
const SORTS = [
  { id: 'newest',     label: 'newest' },
  { id: 'top-rated',  label: '⭐ top rated' },
  { id: 'cheapest',   label: '$ cheapest' },
];

export default function RecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [mealType, setMealType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [rotation, setRotation] = useState('in');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  async function load() {
    try {
      // Map the UI pills to the backend's param names/values.
      const SORT_MAP = { 'top-rated': 'rating', cheapest: 'cost' };
      const params = new URLSearchParams();
      const backendSort = SORT_MAP[sort];
      if (backendSort) params.set('sort', backendSort);
      params.set('in_rotation', rotation === 'paused' ? '0' : '1');
      if (mealType !== 'all') params.set('meal_type', mealType);
      const [data, planData] = await Promise.all([
        get(`/api/recipes?${params}`),
        get('/api/meal-plans/current').catch(() => null),
      ]);
      setRecipes(Array.isArray(data) ? data : data.recipes || []);
      setCurrentPlanId(planData?.id || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setLoading(true); load(); }, [mealType, sort, rotation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [mealType, sort, rotation]);

  async function addToPlan(recipe) {
    if (!currentPlanId) return;
    await post(`/api/meal-plans/${currentPlanId}/items`, {
      recipe_id: recipe.id,
      meal_type: recipe.meal_type,
    }).catch(() => {});
  }

  async function discard(id) {
    await patch(`/api/recipes/${id}`, { in_rotation: false }).catch(() => {});
    setRecipes(r => r.filter(x => x.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-goblin-ink mb-4">recipes</Text>

        {/* Meal type filter */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {MEAL_TYPES.map(t => (
            <GlassPill key={t} active={mealType === t} onPress={() => setMealType(t)}>
              {t}
            </GlassPill>
          ))}
        </View>

        {/* Sort + rotation */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {SORTS.map(s => (
              <GlassPill key={s.id} active={sort === s.id} onPress={() => setSort(s.id)}>
                {s.label}
              </GlassPill>
            ))}
          </View>
          <GlassPill active={rotation === 'paused'} onPress={() => setRotation(r => r === 'paused' ? 'in' : 'paused')}>
            paused
          </GlassPill>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#D4703A"/>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4703A"/>}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe/${item.id}`)}
              onAddToPlan={currentPlanId ? () => addToPlan(item) : undefined}
              onDiscard={() => discard(item.id)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16 gap-3">
              <Text className="text-4xl">🥄</Text>
              <Text className="text-goblin-dim text-center">no recipes yet. generate some from the dashboard.</Text>
            </View>
          }
        />
      )}

      {/* Generate FAB */}
      <TouchableOpacity
        onPress={() => router.push('/settings/generate')}
        style={{
          position: 'absolute', right: 20, bottom: 100,
          backgroundColor: '#D4703A', borderRadius: 999,
          paddingHorizontal: 20, paddingVertical: 14,
          shadowColor: '#9E4E28', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>✦ generate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
