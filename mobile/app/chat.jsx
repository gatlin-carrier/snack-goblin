import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GoblinChat } from '../components/GoblinChat';

export default function ChatScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5EDE0' }} edges={['top']}>
      <GoblinChat onClose={() => router.back()}/>
    </SafeAreaView>
  );
}
