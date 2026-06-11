import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post, del } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function HouseholdScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  useEffect(() => {
    // GET /api/household returns the household object itself: { id, name, members }.
    get('/api/household').then(d => {
      setHousehold(d);
      setMembers(d?.members || []);
      setHouseholdName(d?.name || '');
    }).catch(() => {});
  }, []);

  async function rename() {
    await post('/api/household', { name: householdName }).catch(() => {});
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    // Returns the full household object — sync members from it.
    const d = await post('/api/household/invite', { email: inviteEmail.trim(), display_name: inviteName.trim() }).catch(() => null);
    if (d) { setMembers(d.members || []); setInviteEmail(''); setInviteName(''); }
  }

  async function removeMember(id) {
    Alert.alert('remove member?', 'they will lose access.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'remove', style: 'destructive', onPress: async () => {
        await del(`/api/household/members/${id}`).catch(() => {});
        setMembers(prev => prev.filter(m => m.id !== id));
      }},
    ]);
  }

  async function deleteAccount() {
    if (deletePhrase !== 'delete my account') return;
    // Backend requires the exact confirmation phrase 'DELETE MY ACCOUNT'.
    await post('/api/account/delete', { confirm: 'DELETE MY ACCOUNT' }).catch(() => {});
    await signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>household</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>

        {/* Rename */}
        <View className="gap-3">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">household name</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={householdName} onChangeText={setHouseholdName} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
            <TouchableOpacity onPress={rename} style={{ backgroundColor: '#D4703A', borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>save</Text></TouchableOpacity>
          </View>
        </View>

        {/* Members */}
        <View className="gap-3">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">members</Text>
          {members.map(m => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14, padding: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#3B2212' }}>{m.display_name || m.email}</Text>
                {m.display_name && <Text style={{ fontSize: 12, color: '#7A6150' }}>{m.email}</Text>}
                <Text style={{ fontSize: 11, color: '#9A8374', marginTop: 2 }}>
                  {m.role} {!m.joined_at ? '· awaiting sign-in' : ''}
                </Text>
              </View>
              {m.role !== 'founder' && (
                <TouchableOpacity onPress={() => removeMember(m.id)}>
                  <Text style={{ color: '#BC3838', fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Invite */}
        <View className="gap-3">
          <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">invite someone</Text>
          <TextInput value={inviteEmail} onChangeText={setInviteEmail} placeholder="email@example.com" placeholderTextColor="#9A8374" keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
          <TextInput value={inviteName} onChangeText={setInviteName} placeholder="their name (optional)" placeholderTextColor="#9A8374" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
          <TouchableOpacity onPress={invite} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>send invite</Text></TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View className="gap-3 mt-4">
          <TouchableOpacity onPress={() => setShowDeleteZone(v => !v)}>
            <Text style={{ color: '#BC3838', fontSize: 13 }}>{showDeleteZone ? '▾ ' : '▸ '}danger zone</Text>
          </TouchableOpacity>
          {showDeleteZone && (
            <View style={{ backgroundColor: 'rgba(188,56,56,0.06)', borderRadius: 16, padding: 14, gap: 10 }}>
              <Text style={{ color: '#BC3838', fontSize: 13 }}>type "delete my account" to confirm permanent deletion.</Text>
              <TextInput value={deletePhrase} onChangeText={setDeletePhrase} placeholder="delete my account" placeholderTextColor="#C08080" style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#C08080', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
              <TouchableOpacity onPress={deleteAccount} disabled={deletePhrase !== 'delete my account'} style={{ backgroundColor: '#BC3838', borderRadius: 999, paddingVertical: 13, alignItems: 'center', opacity: deletePhrase !== 'delete my account' ? 0.4 : 1 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>delete account + all data</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
