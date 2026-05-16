import { View, Text, Image, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Badge } from './Badge';
import { photoFor } from '../../shared/tokens';

const MEAL_COLORS = {
  breakfast: '#C09E38',
  lunch:     '#6A9870',
  dinner:    '#D4703A',
  snack:     '#6A3068',
};

export function RecipeCard({ recipe, onPress, onAddToPlan, onDiscard }) {
  const { name, cuisine, meal_type, prep_time_min, cook_time_min, star_rating, rating_count,
          toddler_safe, cost_per_serving, in_rotation, tags = [] } = recipe;

  const totalTime = (prep_time_min || 0) + (cook_time_min || 0);
  const photoUrl = photoFor({ name, cuisine, src: recipe.image_url });
  const finalUrl = photoUrl.includes('unsplash.com') ? `${photoUrl}?w=600&q=70&auto=format&fit=crop` : photoUrl;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
      <View style={{ height: 180 }}>
        <Image source={{ uri: finalUrl }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} resizeMode="cover"/>
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(30,15,5,0.28)' }}/>

        {/* Meal type badge */}
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <View style={{ backgroundColor: MEAL_COLORS[meal_type] || '#D4703A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {meal_type || 'dinner'}
            </Text>
          </View>
        </View>

        {/* Paused badge */}
        {!in_rotation && (
          <View style={{ position: 'absolute', top: 10, right: 10 }}>
            <Badge tone="neutral">paused</Badge>
          </View>
        )}

        {/* Bottom info */}
        <BlurView intensity={30} tint="dark" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {cuisine && <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{cuisine}</Text>}
            {totalTime > 0 && <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{totalTime}m</Text>}
            {cost_per_serving && <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>${cost_per_serving.toFixed(2)}/serving</Text>}
            {toddler_safe && <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>👶</Text>}
          </View>
        </BlurView>
      </View>

      {/* Stars + actions */}
      <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {[1,2,3,4,5].map(i => (
            <Text key={i} style={{ fontSize: 14, color: i <= Math.round(star_rating || 0) ? '#D4703A' : '#D0C4B0' }}>★</Text>
          ))}
          {rating_count > 0 && <Text style={{ fontSize: 11, color: '#7A6150', marginLeft: 4 }}>({rating_count})</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {onAddToPlan && (
            <Pressable onPress={onAddToPlan} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>+ plan</Text>
            </Pressable>
          )}
          {onDiscard && (
            <Pressable onPress={onDiscard} style={{ backgroundColor: 'rgba(200,185,165,0.4)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: '#7A6150', fontSize: 12, fontWeight: '600' }}>skip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
