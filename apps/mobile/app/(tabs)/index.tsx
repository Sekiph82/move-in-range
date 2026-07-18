import { ScrollView, Text, View, Pressable } from "react-native";
import { DailyPlanningEngine, MedicalSafetyPolicyEngine } from "@moveinrange/health-rules";
import { useTheme } from "../../src/theme";
import { demoExercises, demoProfile, demoReadiness } from "../../src/mockData";

export default function TodayScreen() {
  const theme = useTheme();
  const safety = new MedicalSafetyPolicyEngine().evaluate(demoProfile, demoReadiness, demoProfile.diabetes);
  const plan = new DailyPlanningEngine().generate(demoProfile, demoReadiness, demoExercises, demoProfile.dailyAvailableMinutes);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Today</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>Move safely. Learn your range.</Text>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Safety status</Text>
        <Text style={{ color: theme.primary, fontSize: 16 }}>{safety.action}</Text>
        <Text style={{ color: theme.muted }}>{safety.explanation}</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>{plan.totalMinutes}-minute controlled session</Text>
        {plan.items.map((item) => (
          <Text key={item.exerciseId} style={{ color: theme.text }}>{item.block}: {item.name} · {Math.round(item.durationSeconds / 60)} min</Text>
        ))}
      </View>
      <Pressable accessibilityLabel="Start guided workout" style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary }}>
        <Text style={{ color: theme.surface, fontWeight: "700" }}>Start guided workout</Text>
      </Pressable>
    </ScrollView>
  );
}
