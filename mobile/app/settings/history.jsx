import { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get } from '../../lib/api';

const MEAL_COLORS = { breakfast:'#C09E38', lunch:'#6A9870', dinner:'#D4703A', snack:'#6A3068' };

function relTime(dt) {
  const diff = Date.now() - new Date(dt).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(dt).toLocaleDateString();
}

export default function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await get('/api/cook-history').catch(() => []);
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>meal history</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#D4703A"/>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14, padding: 13, gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: (MEAL_COLORS[item.meal_type] || '#D4703A') + '25', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: MEAL_COLORS[item.meal_type] || '#D4703A' }}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#3B2212', fontSize: 14 }} numberOfLines={1}>{item.recipe_name || item.name}</Text>
              <Text style={{ color: '#9A8374', fontSize: 12, marginTop: 2 }}>
                {item.meal_type} · {relTime(item.cooked_at)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: '#9A8374', fontSize: 14 }}>no cooks logged yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
