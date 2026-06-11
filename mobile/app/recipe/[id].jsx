import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { get, post, patch, del } from '../../lib/api';
import { Badge } from '../../components/Badge';
import { photoFor } from '../../../shared/tokens';

const MEAL_COLORS = { breakfast:'#C09E38', lunch:'#6A9870', dinner:'#D4703A', snack:'#6A3068' };

export default function RecipeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    get(`/api/recipes/${id}`).then(data => {
      setRecipe(data);
      setRating(Math.round(data.star_rating || 0));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function rateRecipe(stars) {
    const value = Math.max(1, Math.min(5, Math.round(stars)));
    setRating(value);
    // Backend reads req.body.stars and requires an integer 1–5.
    await post(`/api/recipes/${id}/rate`, { stars: value }).catch(() => {});
  }

  async function deleteRecipe() {
    Alert.alert('delete recipe?', 'this cannot be undone.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'delete', style: 'destructive', onPress: async () => {
        await del(`/api/recipes/${id}`).catch(() => {});
        router.back();
      }},
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center">
        <ActivityIndicator size="large" color="#D4703A"/>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-goblin-bg items-center justify-center px-8">
        <Text className="text-goblin-dim text-center">recipe not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-accent">← back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const photoUrl = photoFor({ name: recipe.name, cuisine: recipe.cuisine, src: recipe.image_url });
  const finalUrl = photoUrl.includes('unsplash.com') ? `${photoUrl}?w=800&q=75&auto=format&fit=crop` : photoUrl;
  const ingredients = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients || '[]') : recipe.ingredients || [];
  const instructions = typeof recipe.instructions === 'string' ? JSON.parse(recipe.instructions || '[]') : recipe.instructions || [];
  const tags = typeof recipe.tags === 'string' ? JSON.parse(recipe.tags || '[]') : recipe.tags || [];

  return (
    <View className="flex-1 bg-goblin-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero image */}
        <View style={{ height: 280 }}>
          <Image source={{ uri: finalUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover"/>
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(20,10,5,0.35)' }}/>

          {/* Close + actions */}
          <SafeAreaView style={{ position: 'absolute', inset: 0 }} edges={['top']}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 18 }}>×</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/cook/${id}`)}
                  style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>cook →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Bottom overlay */}
          <BlurView intensity={30} tint="dark" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ backgroundColor: MEAL_COLORS[recipe.meal_type] || '#D4703A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{recipe.meal_type}</Text>
              </View>
              {recipe.toddler_safe && <Badge tone="sage">toddler safe</Badge>}
            </View>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>{recipe.name}</Text>
          </BlurView>
        </View>

        {/* Meta */}
        <View style={{ flexDirection: 'row', gap: 16, padding: 18, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
          {recipe.cuisine && <View><Text style={{ fontSize: 11, color: '#7A6150' }}>cuisine</Text><Text style={{ fontSize: 14, color: '#3B2212', fontWeight: '600' }}>{recipe.cuisine}</Text></View>}
          {(recipe.prep_time_min || recipe.cook_time_min) && (
            <View><Text style={{ fontSize: 11, color: '#7A6150' }}>time</Text><Text style={{ fontSize: 14, color: '#3B2212', fontWeight: '600' }}>{(recipe.prep_time_min||0)+(recipe.cook_time_min||0)}m</Text></View>
          )}
          {recipe.servings_adult && <View><Text style={{ fontSize: 11, color: '#7A6150' }}>serves</Text><Text style={{ fontSize: 14, color: '#3B2212', fontWeight: '600' }}>{recipe.servings_adult}</Text></View>}
          {recipe.cost_per_serving && <View><Text style={{ fontSize: 11, color: '#7A6150' }}>cost</Text><Text style={{ fontSize: 14, color: '#3B2212', fontWeight: '600' }}>${recipe.cost_per_serving.toFixed(2)}</Text></View>}
        </View>

        {/* Rating */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 18, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
          <Text style={{ fontSize: 13, color: '#7A6150', marginRight: 4 }}>your rating</Text>
          {[1,2,3,4,5].map(i => (
            <TouchableOpacity key={i} onPress={() => rateRecipe(i)}>
              <Text style={{ fontSize: 24, color: i <= rating ? '#D4703A' : '#CFC2AE' }}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        {recipe.description && (
          <Text style={{ fontSize: 14, color: '#4E3322', lineHeight: 22, padding: 18, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>{recipe.description}</Text>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <View style={{ padding: 18, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#3B2212', marginBottom: 12 }}>ingredients</Text>
            {ingredients.map((ing, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,185,165,0.2)' }}>
                <Text style={{ width: 24, color: '#9A8374' }}>·</Text>
                <Text style={{ flex: 1, fontSize: 14, color: '#3B2212' }}>
                  {typeof ing === 'string' ? ing : `${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ing.ingredient || ''}`.trim()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        {instructions.length > 0 && (
          <View style={{ padding: 18, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#3B2212', marginBottom: 12 }}>instructions</Text>
            {instructions.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#D4703A', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3B2212', lineHeight: 22 }}>{typeof step === 'string' ? step : step.step || step.text || ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={{ padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(t => <Badge key={t} tone="neutral">{t}</Badge>)}
          </View>
        )}

        {/* Toddler notes */}
        {recipe.toddler_notes && (
          <View style={{ margin: 18, padding: 14, backgroundColor: 'rgba(106,152,112,0.12)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(106,152,112,0.25)' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3A6B50', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>toddler notes</Text>
            <Text style={{ fontSize: 14, color: '#2A4838', lineHeight: 20 }}>{recipe.toddler_notes}</Text>
          </View>
        )}

        {/* Delete */}
        <TouchableOpacity onPress={deleteRecipe} style={{ margin: 18, padding: 14, backgroundColor: 'rgba(188,56,56,0.08)', borderRadius: 16, alignItems: 'center' }}>
          <Text style={{ color: '#BC3838', fontSize: 14, fontWeight: '600' }}>delete recipe</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
