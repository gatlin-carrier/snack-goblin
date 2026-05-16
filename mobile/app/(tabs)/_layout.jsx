import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import GoblinSvg from '../../components/Goblin';

function TabIcon({ focused, icon, label }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
      <Text style={{ fontSize: 10, fontWeight: focused ? '700' : '500', color: focused ? '#D4703A' : '#7A6150' }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="light"
            style={{ position: 'absolute', inset: 0, borderTopWidth: 0.5, borderTopColor: 'rgba(200,185,165,0.4)' }}
          />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◇" label="today"/> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="☰" label="plan"/> }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◎" label="recipes"/> }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⌗" label="shop"/> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ tabBarIcon: ({ focused }) => (
          <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
            <GoblinSvg state="idle" size={22} />
            <Text style={{ fontSize: 10, fontWeight: focused ? '700' : '500', color: focused ? '#D4703A' : '#7A6150' }}>more</Text>
          </View>
        )}}
      />
    </Tabs>
  );
}
