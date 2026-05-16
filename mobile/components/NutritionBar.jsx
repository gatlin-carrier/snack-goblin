import { View, Text } from 'react-native';

export function NutritionBar({ label, pct, value, max, unit }) {
  const cap = Math.min(100, Math.max(0, pct || 0));
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 12, color: '#4E3322', fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 11, color: '#7A6150' }}>
          {Math.round(value || 0)} / {Math.round(max || 0)} {unit}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(60,40,20,0.10)', overflow: 'hidden' }}>
        <View style={{
          height: '100%',
          width: `${cap}%`,
          backgroundColor: '#C89050',
          borderRadius: 999,
        }} />
      </View>
    </View>
  );
}
