export const SyncColors = {
  background: "#050504",
  surface: "#0c0a08",
  surfaceRaised: "rgba(24, 18, 12, 0.78)",
  text: "#f8f1e4",
  textMuted: "rgba(248, 241, 228, 0.68)",
  textWhisper: "rgba(248, 241, 228, 0.42)",
  accent: "#c49245",
  accentDeep: "#9a6d2c",
  accentSoft: "rgba(196, 146, 69, 0.16)",
  border: "rgba(248, 241, 228, 0.1)",
  borderStrong: "rgba(196, 146, 69, 0.28)",
  chip: "rgba(248, 241, 228, 0.05)",
  chipSelected: "rgba(196, 146, 69, 0.18)",
  chipBorder: "rgba(248, 241, 228, 0.1)",
  chipBorderSelected: "rgba(196, 146, 69, 0.44)",
  buttonText: "#120e08",
  inputBg: "rgba(248, 241, 228, 0.04)",
  captureBorder: "rgba(196, 146, 69, 0.22)",
} as const;

export const SyncSpacing = {
  screen: 20,
  section: 20,
  item: 12,
} as const;

export const SyncTypography = {
  display: {
    fontSize: 34,
    fontWeight: "600" as const,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  body: {
    fontSize: 17,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  whisper: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
    lineHeight: 16,
  },
};
