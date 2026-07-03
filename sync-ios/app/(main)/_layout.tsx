import { Tabs } from "expo-router";

import { SyncColors } from "../../constants/sync-theme";

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SyncColors.surface,
          borderTopColor: SyncColors.border,
        },
        tabBarActiveTintColor: SyncColors.accent,
        tabBarInactiveTintColor: SyncColors.textWhisper,
      }}
    >
      <Tabs.Screen
        name="brief"
        options={{
          title: "Brief",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />
    </Tabs>
  );
}
