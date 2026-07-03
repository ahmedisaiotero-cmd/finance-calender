import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingFlow } from "../components/sync/onboarding-flow";
import { SyncColors, SyncSpacing } from "../constants/sync-theme";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: SyncSpacing.screen,
        },
      ]}
    >
      <OnboardingFlow />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SyncColors.background,
  },
});
