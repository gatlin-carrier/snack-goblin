import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post, del } from '../../lib/api';
import { GlassPill } from '../../components/GlassPill';
import { BarcodeScanner } from '../../components/BarcodeScanner';

const TABS = ['food','freezer','equipment'];

export default function PantryScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('food');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const ENDPOINT = { food: '/api/pantry', freezer: '/api/freezer', equipment: '/api/equipment' };

  async function load() {
    const data = await get(ENDPOINT[tab]).catch(() => []);
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [tab]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [tab]);

  async function addItem(name) {
    const text = (name || newItem).trim();
    if (!text) return;
    // Each tab hits a different route with a different required field:
    //   food → pantry (ingredient_name), freezer → recipe_name, equipment → name.
    const body =
      tab === 'freezer'   ? { recipe_name: text } :
      tab === 'equipment' ? { name: text } :
                            { ingredient_name: text };
    const created = await post(ENDPOINT[tab], body).catch(() => null);
    if (created) setItems(prev => [...prev, created]);
    if (!name) setNewItem('');
  }

  async function handleScan({ name, category }) {
    setScannerOpen(false);
    await addItem(name);
  }

  async function removeItem(id) {
    await del(`${ENDPOINT[tab]}/${id}`).catch(() => {});
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>pantry</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        {TABS.map(t => <GlassPill key={t} active={tab === t} onPress={() => setTab(t)}>{t}</GlassPill>)}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4703A"/>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14, padding: 13, marginBottom: 8 }}>
            <Text style={{ flex: 1, color: '#3B2212', fontSize: 14 }}>
              {item.ingredient_name || item.recipe_name || item.name || item.label}
              {item.use_by_date && <Text style={{ color: '#9A8374', fontSize: 12 }}>  · {item.use_by_date}</Text>}
            </Text>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Text style={{ color: '#9A8374', fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={newItem}
                onChangeText={setNewItem}
                placeholder={`add ${tab} item`}
                placeholderTextColor="#9A8374"
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}
                returnKeyType="done"
                onSubmitEditing={() => addItem()}
              />
              <TouchableOpacity onPress={() => addItem()} style={{ backgroundColor: '#D4703A', borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>add</Text>
              </TouchableOpacity>
              {tab === 'food' && (
                <TouchableOpacity onPress={() => setScannerOpen(true)} style={{ backgroundColor: 'rgba(200,185,165,0.4)', borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>📷</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <BarcodeScanner onResult={handleScan} onClose={() => setScannerOpen(false)}/>
      </Modal>
    </SafeAreaView>
  );
}
