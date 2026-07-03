import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SyncBrandMark } from "./sync-ui";
import { SyncTextInput } from "./sync-text-input";
import { SyncColors, SyncSpacing, SyncTypography } from "../../constants/sync-theme";
import { attemptBriefCapture } from "../../lib/engine/capture-brief-input";
import { useCapturedItems } from "../../lib/engine/captured-items";
import {
  buildDailyBrief,
  formatBriefDate,
  greetingForHour,
} from "../../lib/engine/build-daily-brief";
import { buildTodayView } from "../../lib/engine/build-today-view";
import { loadLifeProfile } from "../../lib/engine/life-profile";
import {
  APP_IN_SYNC,
  BRIEF_LOADING,
  CAPTURE_COMPACT_PLACEHOLDER,
  CAPTURE_PREVIEW,
  CAPTURE_SAVE_FAILED,
} from "../../lib/engine/sync-voice";
import { loadActiveWorkSchedule } from "../../lib/engine/user-timeline-context";

export function BriefScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeItems,
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  } = useCapturedItems();
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const reference = useMemo(() => new Date(), [activeItems.length]);

  const brief = useMemo(
    () =>
      buildDailyBrief({
        items: activeItems,
        workSchedule: loadActiveWorkSchedule() ?? null,
        lifeProfile: loadLifeProfile(),
        reference,
      }),
    [activeItems, reference],
  );

  const todayView = useMemo(
    () =>
      buildTodayView({
        brief,
        consequences: brief.consequences ?? [],
        items: activeItems,
        reference,
        workSchedule: loadActiveWorkSchedule() ?? null,
      }),
    [brief, activeItems, reference],
  );

  const greeting = greetingForHour(new Date().getHours(), brief.userName);
  const dateLabel = formatBriefDate(reference);
  const loading = brief.lede === BRIEF_LOADING;

  const captureContext = () => ({
    items: activeItems,
    workSchedule: loadActiveWorkSchedule() ?? null,
    reference,
  });

  const captureHandlers = {
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  };

  const handleCapture = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setNotice(null);
    const attempt = attemptBriefCapture(trimmed, captureContext(), captureHandlers);

    if (attempt.status === "empty") {
      setNotice(CAPTURE_SAVE_FAILED);
      return;
    }

    if (attempt.status === "too_vague" || attempt.status === "duplicate") {
      setNotice(attempt.message);
      return;
    }

    if (attempt.status === "needs_clarification") {
      setNotice(attempt.message);
      return;
    }

    if (attempt.status === "saved") {
      setNotice("Remembered.");
      setInput("");
    }
  };

  const priorityLines = [
    todayView.primaryPriority,
    ...todayView.supportingPriorities,
  ].slice(0, 5);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <SyncBrandMark />
        <Text style={styles.footerWhisper}>{APP_IN_SYNC}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.greeting}>{greeting}</Text>

        {todayView.reflection && (
          <Text style={styles.reflection}>{todayView.reflection.text}</Text>
        )}

        {loading ? (
          <Text style={styles.lede}>{brief.lede}</Text>
        ) : priorityLines.length === 0 ? (
          <Text style={styles.lede}>{brief.lede}</Text>
        ) : (
          priorityLines.map((line, index) => (
            <Text
              key={`${line.text}-${index}`}
              style={index === 0 ? styles.lede : styles.detail}
            >
              {line.text}
            </Text>
          ))
        )}

        {todayView.futureContext && (
          <Text style={styles.forecast}>{todayView.futureContext.text}</Text>
        )}

        {notice && <Text style={styles.notice}>{notice}</Text>}
      </ScrollView>

      <View style={[styles.captureBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <SyncTextInput
          onChange={setInput}
          onSubmitEditing={handleCapture}
          placeholder={CAPTURE_COMPACT_PLACEHOLDER}
          returnKeyType="send"
          value={input}
        />
        {input.trim().length > 0 && (
          <Pressable onPress={handleCapture} style={styles.captureSubmit}>
            <Text style={styles.captureSubmitLabel}>{CAPTURE_PREVIEW}</Text>
          </Pressable>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SyncSpacing.screen,
    paddingBottom: 8,
  },
  footerWhisper: {
    ...SyncTypography.whisper,
    color: SyncColors.textWhisper,
    textTransform: "none",
    letterSpacing: 0.4,
  },
  scroll: {
    paddingHorizontal: SyncSpacing.screen,
    paddingBottom: 24,
    gap: 14,
  },
  date: {
    ...SyncTypography.caption,
    color: SyncColors.textWhisper,
  },
  greeting: {
    ...SyncTypography.display,
    color: SyncColors.text,
    marginTop: 4,
  },
  reflection: {
    ...SyncTypography.body,
    color: SyncColors.textMuted,
  },
  lede: {
    ...SyncTypography.title,
    color: SyncColors.text,
    marginTop: 8,
  },
  detail: {
    ...SyncTypography.body,
    color: SyncColors.textMuted,
  },
  forecast: {
    ...SyncTypography.body,
    color: SyncColors.textMuted,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SyncColors.border,
  },
  notice: {
    ...SyncTypography.caption,
    color: SyncColors.accent,
    marginTop: 8,
  },
  captureBar: {
    gap: 10,
    paddingHorizontal: SyncSpacing.screen,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SyncColors.captureBorder,
    backgroundColor: SyncColors.surface,
  },
  captureSubmit: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SyncColors.accentSoft,
  },
  captureSubmitLabel: {
    color: SyncColors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
