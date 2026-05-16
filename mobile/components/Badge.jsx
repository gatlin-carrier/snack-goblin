import { View, Text } from 'react-native';

const TONES = {
  neutral: { bg: 'rgba(255,255,255,0.6)',      fg: '#4E3322' },
  accent:  { bg: 'rgba(212,112,58,0.18)',       fg: '#D4703A' },
  rust:    { bg: 'rgba(158,78,40,0.20)',        fg: '#9E4E28' },
  yellow:  { bg: 'rgba(192,158,56,0.22)',       fg: '#7A6000' },
  plum:    { bg: 'rgba(106,48,104,0.18)',       fg: '#6A3068' },
  sage:    { bg: 'rgba(212,112,58,0.18)',       fg: '#D4703A' },
};

export function Badge({ children, tone = 'neutral' }) {
  const c = TONES[tone] || TONES.neutral;
  return (
    <View style={{
      backgroundColor: c.bg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    }}>
      <Text style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        color: c.fg,
      }}>
        {children}
      </Text>
    </View>
  );
}
