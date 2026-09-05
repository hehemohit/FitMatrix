import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  loading,
  onSend,
  placeholder = 'Ask workout or diet advice...',
}) => {
  const [inputText, setInputText] = React.useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;
    setInputText('');
    onSend(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.bubble,
              m.sender === 'user' ? styles.userBubble : styles.coachBubble,
            ]}
          >
            {m.sender === 'coach' && (
              <Text style={styles.senderLabel}>FitMatrix Coach</Text>
            )}
            <Text style={m.sender === 'user' ? styles.userText : styles.coachText}>
              {m.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.coachBubble}>
            <ActivityIndicator size="small" color="#1a73e8" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },
  bubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a73e8',
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eee',
    borderBottomLeftRadius: 4,
    minWidth: 50,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a73e8',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  userText: { color: '#ffffff', fontSize: 14, lineHeight: 20 },
  coachText: { color: '#111111', fontSize: 14, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fafafa',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: '#b0c8f9' },
  sendButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
