import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppLanguage } from "../../src/i18n/LanguageProvider";

export default function TabsLayout() {
  const { t } = useAppLanguage();
  return (
    <Tabs screenOptions={{ tabBarLabelStyle: { fontSize: 12 }, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="program" options={{ title: t("tabs.program"), tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="move" options={{ title: t("tabs.move"), tabBarIcon: ({ color, size }) => <Feather name="play-circle" color={color} size={size} /> }} />
      <Tabs.Screen name="progress" options={{ title: t("tabs.progress"), tabBarIcon: ({ color, size }) => <Feather name="trending-up" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }} />
      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="daily-plan" options={{ href: null }} />
      <Tabs.Screen name="weekly-plan" options={{ href: null }} />
      <Tabs.Screen name="monthly-plan" options={{ href: null }} />
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="exercise/[id]" options={{ href: null }} />
      <Tabs.Screen name="readiness" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
    </Tabs>
  );
}
