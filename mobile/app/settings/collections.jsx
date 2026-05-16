import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post, del } from '../../lib/api';

export default function CollectionsScreen() {
  const router = useRouter();
  const [collections, setCollections] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [recipes, setRecipes] = useState({});
  const [newName, setNewName] = useState('');

  useEffect(() => {
    get('/api/collections').then(setCollections).catch(() => {});
  }, []);

  async function create() {
    if (!newName.trim()) return;
    const c = await post('/api/collections', { name: newName.trim() }).catch(() => null);
    if (c) { setCollections(prev => [...prev, c]); setNewName(''); }
  }

  async function remove(id) {
    await del(`/api/collections/${id}`).catch(() => {});
    setCollections(prev => prev.filter(c => c.id !== id));
    if (expanded === id) setExpanded(null);
  }

  async function expand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!recipes[id]) {
      const data = await get(`/api/collections/${id}/recipes`).catch(() => []);
      setRecipes(r => ({ ...r, [id]: data || [] }));
    }
  }

  async function removeFromCollection(collId, recipeId) {
    await del(`/api/collections/${collId}/recipes/${recipeId}`).catch(() => {});
    setRecipes(r => ({ ...r, [collId]: (r[collId] || []).filter(x => x.id !== recipeId) }));
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>collections</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <FlatList
        data={collections}
        keyExtractor={c => c.id.toString()}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput value={newName} onChangeText={setNewName} placeholder="new collection name" placeholderTextColor="#9A8374" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }} returnKeyType="done" onSubmitEditing={create}/>
            <TouchableOpacity onPress={create} style={{ backgroundColor: '#D4703A', borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>+</Text></TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => expand(item.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
              <Text style={{ flex: 1, fontWeight: '600', color: '#3B2212', fontSize: 15 }}>{item.name}</Text>
              <Text style={{ color: '#9A8374', marginRight: 10 }}>{item.recipe_count || 0} recipes</Text>
              <Text style={{ color: '#CFC2AE' }}>{expanded === item.id ? '▾' : '▸'}</Text>
              <TouchableOpacity onPress={() => remove(item.id)} style={{ marginLeft: 12 }}><Text style={{ color: '#BC3838', fontSize: 16 }}>×</Text></TouchableOpacity>
            </TouchableOpacity>
            {expanded === item.id && (recipes[item.id] || []).map(r => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(200,185,165,0.3)' }}>
                <Text style={{ flex: 1, color: '#4E3322', fontSize: 14 }}>{r.name}</Text>
                <TouchableOpacity onPress={() => removeFromCollection(item.id, r.id)}><Text style={{ color: '#9A8374', fontSize: 16 }}>×</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
