import { View } from 'react-native';
import { BlurView } from 'expo-blur';

export function Glass({ children, style, padding = 16, radius = 22, strong = false, tint }) {
  return (
    <View style={{ borderRadius: radius, overflow: 'hidden', ...style }}>
      <BlurView
        intensity={strong ? 60 : 40}
        tint={tint || 'light'}
        style={{ padding }}
      >
        <View style={{
          backgroundColor: strong ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.38)',
          borderRadius: radius,
          padding: 0,
          borderWidth: 0.5,
          borderColor: 'rgba(200,185,165,0.45)',
        }}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

export function GlassSheet({ children, style, padding = 20 }) {
  return (
    <View style={{ borderRadius: 28, overflow: 'hidden', ...style }}>
      <BlurView intensity={50} tint="light" style={{ padding }}>
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.45)',
          borderRadius: 28,
          borderWidth: 0.5,
          borderColor: 'rgba(200,185,165,0.40)',
        }}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}
