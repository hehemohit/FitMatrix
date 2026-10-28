import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useTrainerStore } from '../../store/useTrainerStore';
import { sendBiometricsAndMessage, getChatHistory, getActiveUserIdFromAuth } from '../../api/coachApi';
import { dispatchAgentAction } from '../../services/agentActionDispatcher';

interface CoachBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface MessageItem {
  id: string;
  role: 'user' | 'coach';
  text: string;
  timestamp?: string;
}

const QUICK_PROMPTS = [
  'How is my recovery & readiness today?',
  'Suggest a 40g protein post-workout snack',
  'Should I overload bench press today?',
  'How to adjust macros for rest day?',
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CoachBottomSheet: React.FC<CoachBottomSheetProps> = ({ visible, onClose }) => {
  const { userProfile, dailyLog, coachState, dailyBriefing, metabolicTargets } = useTrainerStore();
  
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const effectiveReadiness = dailyBriefing?.readiness_score ?? coachState.readiness_score ?? 82;
  const effectiveFatigue = dailyBriefing?.fatigue_flag ?? coachState.fatigue_flag ?? 'normal';
  const targetCalories = userProfile.target_calories || metabolicTargets.target_calories || 2200;
  const targetProtein = userProfile.target_protein_g || metabolicTargets.target_protein_g || 160;
  const loggedCalories = dailyLog.calories_logged || 0;
  const loggedProtein = dailyLog.protein_logged_g || 0;
  const remainingCalories = Math.max(0, targetCalories - loggedCalories);
  const remainingProtein = Math.max(0, targetProtein - loggedProtein);

  // Hydrate conversation turns from durable session store on open
  useEffect(() => {
    if (visible) {
      let isMounted = true;
      const hydrate = async () => {
        try {
          const userId = getActiveUserIdFromAuth();
          const history = await getChatHistory(userId);
          if (isMounted && history?.messages && history.messages.length > 0) {
            const formatted: MessageItem[] = history.messages.map((m, idx) => ({
              id: `hist_${idx}_${Date.now()}`,
              role: m.role,
              text: m.content,
              timestamp: m.timestamp,
            }));
            setMessages(formatted);
          } else if (isMounted && messages.length === 0) {
            // Friendly initial greeting if zero prior history
            setMessages([
              {
                id: 'init_welcome',
                role: 'coach',
                text: dailyBriefing?.briefing_text 
                  ? `👋 Hi! Based on today's check-in: ${dailyBriefing.headline}. ${dailyBriefing.briefing_text}\n\nWhat can I assist you with right now?`
                  : `👋 Hi! I'm your biometric AI coach. I have full context on your ${userProfile.fitness_goal || 'training'} target, daily macros, and volume landmarks. What's on your mind?`,
              },
            ]);
          }
        } catch {
          // Fallback to local state if offline
        }
      };
      hydrate();
      return () => {
        isMounted = false;
      };
    }
  }, [visible, dailyBriefing]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd?.({ animated: true });
      }, 200);
    }
  }, [messages, visible]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    const userMsg: MessageItem = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const userId = getActiveUserIdFromAuth();
      const response = await sendBiometricsAndMessage({
        user_id: userId,
        message: text,
        readiness_score: effectiveReadiness,
        steps_today: 0,
        sleep_minutes: 450,
        user_profile: {
          weight_kg: userProfile.weight_kg,
          height_cm: userProfile.height_cm,
          age: userProfile.age,
          fitness_goal: userProfile.fitness_goal,
          activity_level: userProfile.activity_level,
          dietary_preference: userProfile.dietary_preference,
          target_calories: targetCalories,
          target_protein_g: targetProtein,
        },
        daily_log: {
          calories_logged: loggedCalories,
          protein_logged_g: loggedProtein,
          calorie_goal: targetCalories,
          protein_goal_g: targetProtein,
        },
      });

      const coachMsg: MessageItem = {
        id: `coach_${Date.now()}`,
        role: 'coach',
        text: response.reply || 'Guidance synchronized with your biometric targets.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, coachMsg]);

      // Execute any returned MCP-style actions
      if (response.action_dispatches && response.action_dispatches.length > 0) {
        for (const action of response.action_dispatches) {
          const res = await dispatchAgentAction(action);
          if (res.success) {
            setMessages(prev => [
              ...prev,
              {
                id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                role: 'coach',
                text: `⚡ Executed: ${res.message}`,
                timestamp: new Date().toISOString(),
              },
            ]);
            if (action.action_type === 'START_WORKOUT') {
              setTimeout(() => {
                onClose();
              }, 700);
            }
          }
        }
      }
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `err_${Date.now()}`,
        role: 'coach',
        text: '⚠️ Unable to connect to coach right now. Please verify your connection or try again shortly.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <View style={styles.badge}>
                  <Text style={styles.badgeDot}>🟢</Text>
                  <Text style={styles.badgeText}>BIOMETRIC SYNCED</Text>
                </View>
                <Text style={styles.headerTitle}>FitMatrix AI Coach</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Context Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Readiness</Text>
                <Text style={styles.pillValue}>{effectiveReadiness}% ({effectiveFatigue})</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Goal</Text>
                <Text style={styles.pillValue}>{userProfile.fitness_goal?.replace('_', ' ') || 'Hypertrophy'}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Remaining</Text>
                <Text style={styles.pillValue}>{remainingCalories} kcal</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Protein Left</Text>
                <Text style={styles.pillValue}>{remainingProtein}g</Text>
              </View>
            </ScrollView>
          </View>

          {/* Quick Prompts Bar */}
          <View style={styles.quickPromptsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsScroll}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={`prompt_${idx}`}
                  style={styles.quickChip}
                  onPress={() => handleSendMessage(prompt)}
                  disabled={loading}
                >
                  <Text style={styles.quickChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Message Stream */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.coachBubble,
                ]}
              >
                {msg.role === 'coach' && (
                  <View style={styles.coachAvatar}>
                    <Text style={styles.coachAvatarText}>🤖</Text>
                  </View>
                )}
                <View style={styles.messageTextContainer}>
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === 'user' ? styles.userMessageText : styles.coachMessageText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}

            {loading && (
              <View style={[styles.messageBubble, styles.coachBubble]}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>🤖</Text>
                </View>
                <View style={styles.typingContainer}>
                  <ActivityIndicator size="small" color="#00e5ff" />
                  <Text style={styles.typingText}>Analyzing biometrics...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask about diet, workout, or recovery..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={400}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || loading) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    height: SCREEN_HEIGHT * 0.82,
    backgroundColor: '#121214',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: '#26262b',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e24',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#3a3a42',
    alignSelf: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleLeft: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  badgeDot: {
    fontSize: 9,
    marginRight: 5,
  },
  badgeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e1e24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pillsScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  pill: {
    backgroundColor: '#1c1c22',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a34',
  },
  pillLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pillValue: {
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  quickPromptsContainer: {
    backgroundColor: '#16161b',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#202028',
  },
  quickPromptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#22222c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#343444',
  },
  quickChipText: {
    color: '#a0a0b8',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#121214',
  },
  messagesContent: {
    padding: 16,
    gap: 14,
  },
  messageBubble: {
    flexDirection: 'row',
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#273859',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1c1c24',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#262634',
  },
  coachAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#262634',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  coachAvatarText: {
    fontSize: 14,
  },
  messageTextContainer: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  coachMessageText: {
    color: '#e4e4ed',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  typingText: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1a1a20',
    borderTopWidth: 1,
    borderTopColor: '#262630',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111116',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: '#2d2d3a',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#333',
  },
  sendBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
});
