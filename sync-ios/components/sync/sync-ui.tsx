import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SyncColors, SyncTypography } from "../../constants/sync-theme";

type SyncBrandMarkProps = {
  size?: "sm" | "lg";
};

export function SyncBrandMark({ size = "sm" }: SyncBrandMarkProps) {
  const large = size === "lg";

  return (
    <View style={[styles.mark, large && styles.markLg]}>
      <View style={[styles.dot, large && styles.dotLg]} />
      <Text style={[styles.label, large && styles.labelLg]}>Sync</Text>
    </View>
  );
}

type SyncPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function SyncPrimaryButton({
  label,
  onPress,
  disabled = false,
}: SyncPrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

type ChipGridProps = {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
};

export function SyncChipGrid({ options, selected, onToggle }: ChipGridProps) {
  return (
    <View style={styles.chipGrid}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onToggle(option)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type OnboardingShellProps = {
  eyebrow: string;
  question: string;
  step: { current: number; total: number };
  children: ReactNode;
  footer: ReactNode;
};

export function OnboardingShell({
  eyebrow,
  question,
  step,
  children,
  footer,
}: OnboardingShellProps) {
  return (
    <View style={styles.shellRoot}>
      <View style={styles.shellScroll}>
        <Text style={styles.step}>
          {step.current} of {step.total}
        </Text>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.question}>{question}</Text>
        <View style={styles.shellBody}>{children}</View>
      </View>
      <View style={styles.shellFooter}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markLg: {
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: SyncColors.accent,
  },
  dotLg: {
    width: 12,
    height: 12,
  },
  label: {
    color: SyncColors.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  labelLg: {
    fontSize: 20,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SyncColors.accent,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonLabel: {
    color: SyncColors.buttonText,
    fontSize: 17,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SyncColors.chipBorder,
    backgroundColor: SyncColors.chip,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    borderColor: SyncColors.chipBorderSelected,
    backgroundColor: SyncColors.chipSelected,
  },
  chipLabel: {
    color: SyncColors.textMuted,
    fontSize: 15,
    fontWeight: "500",
  },
  chipLabelActive: {
    color: SyncColors.text,
  },
  shellRoot: {
    flex: 1,
    justifyContent: "space-between",
  },
  shellScroll: {
    flex: 1,
    paddingTop: 12,
    gap: 12,
  },
  step: {
    ...SyncTypography.whisper,
    color: SyncColors.textWhisper,
  },
  eyebrow: {
    ...SyncTypography.whisper,
    color: SyncColors.accent,
  },
  question: {
    ...SyncTypography.display,
    color: SyncColors.text,
    marginTop: 4,
  },
  shellBody: {
    marginTop: 20,
  },
  shellFooter: {
    paddingTop: 16,
    paddingBottom: 8,
  },
});
