import { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { CapturedItemsProvider } from "../lib/engine/captured-items";
import { initSyncStorage } from "../lib/storage";
import { SyncColors } from "../constants/sync-theme";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    initSyncStorage()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={SyncColors.accent} />
      </View>
    );
  }

  return <CapturedItemsProvider>{children}</CapturedItemsProvider>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SyncColors.background,
  },
});
