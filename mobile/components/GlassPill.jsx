import { TouchableOpacity, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

export function GlassPill({ children, active = false, onPress, style }) {
  if (active) {
    return (
      <View style={{ borderRadius: 999, overflow: 'hidden', ...style }}>
        <BlurView intensity={28} tint="light">
          <TouchableOpacity
            onPress={onPress}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              backgroundColor: 'rgba(255,255,255,0.78)',
              borderRadius: 999,
              borderWidth: 0.5,
              borderColor: 'rgba(200,185,165,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#3B2212' }}>
              {children}
            </Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#7A6150' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}
