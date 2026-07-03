import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { SyncColors } from "../constants/sync-theme";
import { isStorageReady } from "../lib/storage";
import { isOnboardingComplete } from "../lib/engine/user-profile";

export default function Index() {
  const [ready, setReady] = useState(isStorageReady());
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    if (!ready) {
      const timer = setInterval(() => {
        if (isStorageReady()) {
          setReady(true);
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }

    setOnboarded(isOnboardingComplete());
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={SyncColors.accent} />
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(main)/brief" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SyncColors.background,
  },
});
