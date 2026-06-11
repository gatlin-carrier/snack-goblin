import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { get, post, del } from '../lib/api';
import GoblinSvg from './Goblin';

export function GoblinChat({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef(null);

  useEffect(() => {
    // GET returns a bare array of { id, role, content, created_at }.
    get('/api/goblin/chat').then(d => setMessages(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const optimistic = { role: 'user', content: text, id: Date.now() };
    setMessages(m => [...m, optimistic]);
    setLoading(true);
    try {
      // POST returns { reply: string } — append it to the existing thread.
      const data = await post('/api/goblin/chat', { message: text });
      setMessages(m => [...m, { role: 'assistant', content: data.reply, id: Date.now() + 1 }]);
    } catch {
      setMessages(m => m.filter(msg => msg.id !== optimistic.id));
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    await del('/api/goblin/chat').catch(() => {});
    setMessages([]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#CFC2AE' }}>
        <GoblinSvg state="curious" size={32}/>
        <Text style={{ flex: 1, marginLeft: 10, fontSize: 17, fontWeight: '700', color: '#3B2212' }}>goblin chat</Text>
        <TouchableOpacity onPress={clearHistory} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 13, color: '#7A6150' }}>clear</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
              <View style={{
                maxWidth: '78%',
                backgroundColor: isUser ? 'rgba(212,112,58,0.14)' : 'rgba(255,255,255,0.72)',
                borderRadius: 18,
                borderBottomRightRadius: isUser ? 6 : 18,
                borderBottomLeftRadius: isUser ? 18 : 6,
                padding: 12,
                borderWidth: 0.5,
                borderColor: isUser ? 'rgba(212,112,58,0.25)' : 'rgba(200,185,165,0.4)',
              }}>
                <Text style={{ fontSize: 14, color: '#3B2212', lineHeight: 20 }}>{item.content}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
            <GoblinSvg state="idle" size={60}/>
            <Text style={{ color: '#9A8374', fontSize: 14, textAlign: 'center' }}>
              ask me anything — meals, nutrition, what to do with leftover rice.
            </Text>
          </View>
        }
      />

      {loading && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
          <ActivityIndicator size="small" color="#D4703A"/>
        </View>
      )}

      {/* Input */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 0.5, borderTopColor: '#CFC2AE' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="ask the goblin…"
          placeholderTextColor="#9A8374"
          multiline
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.72)',
            borderRadius: 18,
            borderWidth: 0.5,
            borderColor: '#CFC2AE',
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 14,
            color: '#3B2212',
            maxHeight: 100,
          }}
          returnKeyType="send"
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!input.trim() || loading}
          style={{
            backgroundColor: '#D4703A',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: !input.trim() || loading ? 0.5 : 1,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
