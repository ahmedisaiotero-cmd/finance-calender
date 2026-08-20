import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SyncTextInput } from "./sync-text-input";
import { SyncColors, SyncSpacing, SyncTypography } from "../../constants/sync-theme";
import { applyChatTurn } from "../../../lib/sync-capture/apply-chat-turn";
import { useCapturedItems } from "../../lib/engine/captured-items";
import { loadLifeProfile } from "../../lib/engine/life-profile";
import { loadActiveWorkSchedule } from "../../lib/engine/user-timeline-context";

type ChatMessage = {
  id: string;
  role: "user" | "sync";
  text: string;
};

function curiousReply(userText: string, name: string | null): string {
  const lower = userText.toLowerCase();
  const who = name?.trim() || "you";

  if (/\b(stress|anxious|overwhelm|tired|exhausted)\b/.test(lower)) {
    return `That sounds like a lot, ${who}. Want to tell me what's weighing on you most — or should I keep today lighter in your briefing?`;
  }

  if (/\b(gym|workout|run|health|sleep)\b/.test(lower)) {
    return "Got it. I'll keep health in view — no pressure, just context when it helps.";
  }

  if (/\b(money|rent|bill|pay|budget|spent)\b/.test(lower)) {
    return "I'll fold that into what matters financially — calm heads up, not alarms.";
  }

  if (/\b(family|mom|dad|partner|wife|husband|kids|daughter|son)\b/.test(lower)) {
    return "People first. I'll remember this when I'm choosing what deserves your attention.";
  }

  if (/\b(work|shift|meeting|deadline|project)\b/.test(lower)) {
    return "Work noted. I'll surface it when timing actually matters.";
  }

  if (userText.trim().endsWith("?")) {
    return "I'm still learning — tell me what happened or what's coming, and I'll remember the shape of it.";
  }

  return "Thanks for telling me. I'll readjust your briefing around this — curious if there's more context when you have a second.";
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { activeItems, addCapturedItem, updateCapturedItem, softDeleteCapturedItem } =
    useCapturedItems();
  const profile = loadLifeProfile();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "sync",
      text: profile.name
        ? `Hi ${profile.name}. What's on your mind — or what should I know better about your week?`
        : "What's on your mind — or what should I know better about your week?",
    },
  ]);

  const reference = useMemo(() => new Date(), [messages.length]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    applyChatTurn(
      trimmed,
      {
        items: activeItems,
        workSchedule: loadActiveWorkSchedule() ?? null,
        reference,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        priorAssistantText: [...messages]
          .reverse()
          .find((message) => message.role === "sync")?.text,
      },
      {
        addCapturedItem,
        updateCapturedItem,
        softDeleteCapturedItem,
      },
    );

    const syncMessage: ChatMessage = {
      id: `sync-${Date.now()}`,
      role: "sync",
      text: curiousReply(trimmed, profile.name),
    };

    setMessages((current) => [...current, userMessage, syncMessage]);
    setInput("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>Curious, not pushy.</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.syncBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === "user" ? styles.userText : styles.syncText,
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <SyncTextInput
          multiline
          onChange={setInput}
          placeholder="Tell Sync something…"
          value={input}
        />
        <Pressable
          disabled={!input.trim()}
          onPress={send}
          style={[styles.send, !input.trim() && styles.sendDisabled]}
        >
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SyncColors.background,
  },
  header: {
    paddingHorizontal: SyncSpacing.screen,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    ...SyncTypography.title,
    color: SyncColors.text,
  },
  subtitle: {
    ...SyncTypography.caption,
    color: SyncColors.textWhisper,
    textTransform: "none",
    letterSpacing: 0,
  },
  list: {
    paddingHorizontal: SyncSpacing.screen,
    paddingBottom: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: SyncColors.accent,
  },
  syncBubble: {
    alignSelf: "flex-start",
    backgroundColor: SyncColors.surfaceRaised,
    borderWidth: 1,
    borderColor: SyncColors.border,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: SyncColors.buttonText,
  },
  syncText: {
    color: SyncColors.text,
  },
  composer: {
    gap: 10,
    paddingHorizontal: SyncSpacing.screen,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SyncColors.captureBorder,
    backgroundColor: SyncColors.surface,
  },
  send: {
    alignSelf: "flex-end",
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SyncColors.accent,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: SyncColors.buttonText,
    fontWeight: "600",
    fontSize: 15,
  },
});
