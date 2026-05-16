import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { get, post, patch } from '../../lib/api';

const CATEGORIES = ['produce','meat','seafood','dairy','frozen','bakery','pantry','other'];
const CAT_EMOJI = { produce:'🥦', meat:'🥩', seafood:'🐟', dairy:'🧀', frozen:'🧊', bakery:'🍞', pantry:'🫙', other:'📦' };

export default function ShoppingScreen() {
  const [planId, setPlanId] = useState(null);
  const [listId, setListId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      const plan = await get('/api/meal-plans/current').catch(() => null);
      if (!plan?.id) return;
      setPlanId(plan.id);
      const listData = await get(`/api/shopping-lists/for-plan/${plan.id}`).catch(() => null);
      if (listData?.id) {
        setListId(listData.id);
        const detail = await get(`/api/shopping-lists/${listData.id}`);
        setItems(detail.items || []);
      }
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

  async function generate() {
    if (!planId) return;
    setGenerating(true);
    try {
      const data = await post('/api/shopping-lists', { meal_plan_id: planId });
      setListId(data.id);
      const detail = await get(`/api/shopping-lists/${data.id}`);
      setItems(detail.items || []);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleItem(item) {
    if (!listId) return;
    const next = !item.checked;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i));
    await patch(`/api/shopping-lists/${listId}/items/${item.id}`, { checked: next }).catch(() => {});
  }

  async function shareList() {
    const text = CATEGORIES
      .map(cat => {
        const catItems = items.filter(i => i.category === cat && !i.checked);
        if (!catItems.length) return '';
        return `${CAT_EMOJI[cat] || '•'} ${cat.toUpperCase()}\n${catItems.map(i => `  ${i.ingredient} ${i.quantity ? `(${i.quantity} ${i.unit || ''})`.trim() : ''}`).join('\n')}`;
      })
      .filter(Boolean)
      .join('\n\n');
    await Share.share({ message: text || 'no items left to buy' });
  }

  const checkedCount = items.filter(i => i.checked).length;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#D4703A"/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-goblin-ink">shopping</Text>
          <View className="flex-row gap-3 items-center">
            {items.length > 0 && (
              <TouchableOpacity onPress={shareList}>
                <Text style={{ fontSize: 13, color: '#7A6150' }}>share ↑</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={generate}
              disabled={generating}
              style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              {generating ? <ActivityIndicator size="small" color="white"/> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>regenerate</Text>}
            </TouchableOpacity>
          </View>
        </View>
        {items.length > 0 && (
          <Text className="text-goblin-dim text-sm mt-1">{checkedCount} / {items.length} checked</Text>
        )}
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="text-4xl">🛒</Text>
          <Text className="text-goblin-ink text-lg font-bold text-center">no list yet</Text>
          <Text className="text-goblin-dim text-center text-sm">generate a shopping list from your current meal plan.</Text>
          <TouchableOpacity
            onPress={generate}
            disabled={generating || !planId}
            style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 13, opacity: !planId ? 0.5 : 1 }}
          >
            {generating ? <ActivityIndicator size="small" color="white"/> : <Text style={{ color: 'white', fontWeight: '700' }}>generate list</Text>}
          </TouchableOpacity>
          {!planId && <Text className="text-goblin-faint text-sm text-center">build a meal plan first</Text>}
        </View>
      ) : (
        <FlatList
          data={CATEGORIES}
          keyExtractor={cat => cat}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4703A"/>}
          renderItem={({ item: cat }) => {
            const catItems = items.filter(i => (i.category || 'other') === cat);
            if (!catItems.length) return null;
            const allChecked = catItems.every(i => i.checked);
            return (
              <View className="mb-4">
                {/* Category header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 16 }}>{CAT_EMOJI[cat] || '📦'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A6150', textTransform: 'uppercase', letterSpacing: 0.8 }}>{cat}</Text>
                  {allChecked && <View style={{ backgroundColor: 'rgba(106,152,112,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#6A9870', fontWeight: '600' }}>done</Text></View>}
                </View>

                {/* Items */}
                <View style={{ borderRadius: 18, overflow: 'hidden' }}>
                  <BlurView intensity={35} tint="light">
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.42)', borderRadius: 18 }}>
                      {catItems.map((item, idx) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => toggleItem(item)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
                            borderTopWidth: idx > 0 ? 0.5 : 0, borderTopColor: 'rgba(200,185,165,0.3)',
                          }}
                        >
                          <View style={{
                            width: 22, height: 22, borderRadius: 11,
                            borderWidth: 1.5, borderColor: item.checked ? '#D4703A' : '#CFC2AE',
                            backgroundColor: item.checked ? '#D4703A' : 'transparent',
                            alignItems: 'center', justifyContent: 'center', marginRight: 12,
                          }}>
                            {item.checked && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                          </View>
                          <Text style={{
                            flex: 1, fontSize: 14, color: item.checked ? '#9A8374' : '#3B2212',
                            textDecorationLine: item.checked ? 'line-through' : 'none',
                          }}>
                            {item.ingredient}
                          </Text>
                          {(item.quantity || item.unit) && (
                            <Text style={{ fontSize: 12, color: '#9A8374' }}>{item.quantity} {item.unit}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </BlurView>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
