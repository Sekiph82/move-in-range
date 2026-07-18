import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarLabelStyle: { fontSize: 12 }, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color, size }) => <Feather name="activity" color={color} size={size} /> }} />
      <Tabs.Screen name="plan" options={{ title: "Plan", tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="move" options={{ title: "Move", tabBarIcon: ({ color, size }) => <Feather name="zap" color={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }} />
    </Tabs>
  );
}
