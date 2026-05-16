import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../lib/auth';
import { GoblinWidget } from '../../components/Goblin';

function MenuItem({ icon, label, desc, onPress, danger = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
      activeOpacity={0.6}
    >
      <Text style={{ fontSize: 20, width: 36 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: danger ? '#BC3838' : '#3B2212' }}>{label}</Text>
        {desc && <Text style={{ fontSize: 12, color: '#7A6150', marginTop: 1 }}>{desc}</Text>}
      </View>
      <Text style={{ color: '#CFC2AE', fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

function MenuSection({ title, children }) {
  return (
    <View className="mx-4 mb-4">
      {title && <Text style={{ fontSize: 11, fontWeight: '700', color: '#7A6150', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8, paddingHorizontal: 4 }}>{title}</Text>}
      <View style={{ borderRadius: 20, overflow: 'hidden' }}>
        <BlurView intensity={35} tint="light">
          <View style={{ backgroundColor: 'rgba(255,255,255,0.42)', borderRadius: 20 }}>
            {children}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 0.5, backgroundColor: 'rgba(200,185,165,0.4)', marginHorizontal: 16 }}/>;
}

export default function MenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <GoblinWidget state="idle" size={52} showCopy={false}/>
          <View>
            <Text className="text-goblin-ink text-lg font-bold">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'goblin'}</Text>
            <Text className="text-goblin-dim text-sm">{user?.email}</Text>
          </View>
        </View>

        {/* Logs */}
        <MenuSection title="logs">
          <MenuItem icon="📖" label="meal history" desc="your cooking log" onPress={() => router.push('/settings/history')}/>
          <Divider/>
          <MenuItem icon="🥛" label="drink log" desc="daily beverage tracking" onPress={() => router.push('/settings/drinks')}/>
          <Divider/>
          <MenuItem icon="🌱" label="first foods" desc="infant allergen tracker" onPress={() => router.push('/settings/first-foods')}/>
          <Divider/>
          <MenuItem icon="📦" label="collections" desc="themed recipe groups" onPress={() => router.push('/settings/collections')}/>
        </MenuSection>

        {/* Tracking */}
        <MenuSection title="tracking">
          <MenuItem icon="⚠️" label="allergens" desc="allergen introduction log" onPress={() => router.push('/settings/allergens')}/>
          <Divider/>
          <MenuItem icon="🧒" label="child profile" desc="age, RDAs, choking hazards" onPress={() => router.push('/settings/child-profile')}/>
          <Divider/>
          <MenuItem icon="💪" label="adult goals" desc="calorie + macro targets" onPress={() => router.push('/settings/adult-goals')}/>
          <Divider/>
          <MenuItem icon="🍱" label="pantry" desc="inventory, freezer, equipment" onPress={() => router.push('/settings/pantry')}/>
        </MenuSection>

        {/* AI + integrations */}
        <MenuSection title="ai & integrations">
          <MenuItem icon="🤖" label="ai model" desc="provider, model, api key" onPress={() => router.push('/settings/llm')}/>
          <Divider/>
          <MenuItem icon="🔌" label="integrations" desc="Instacart, Kroger, Pexels" onPress={() => router.push('/settings/integrations')}/>
          <Divider/>
          <MenuItem icon="🔔" label="notifications" desc="ntfy.sh push alerts" onPress={() => router.push('/settings/notifications')}/>
        </MenuSection>

        {/* Goblin */}
        <MenuSection title="goblin">
          <MenuItem icon="👺" label="goblin settings" desc="name your goblin" onPress={() => router.push('/settings/goblin')}/>
          <Divider/>
          <MenuItem icon="🏠" label="household" desc="members, invites, account" onPress={() => router.push('/settings/household')}/>
        </MenuSection>

        {/* Sign out */}
        <MenuSection>
          <MenuItem icon="↪" label="sign out" onPress={signOut} danger/>
        </MenuSection>
      </ScrollView>
    </SafeAreaView>
  );
}
