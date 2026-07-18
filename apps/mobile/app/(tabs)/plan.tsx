import { Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, generateMonthlyPlan, generateWeeklyPlan } from "../../src/api";
import { useTheme } from "../../src/theme";

export default function PlanScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<any>("/plans/weekly/current") });
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<any>("/plans/monthly/current") });
  const makeWeekly = useMutation({ mutationFn: generateWeeklyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly"] }) });
  const makeMonthly = useMutation({ mutationFn: generateMonthlyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly"] }) });
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Plan</Text>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Seven-day plan</Text>
        {weekly.data?.plan?.days?.map((day: any) => <Text key={day.day} style={{ color: theme.text }}>{day.day}: {day.status} - {day.planned_duration} min - {day.intensity}</Text>) ?? <Text style={{ color: theme.muted }}>No weekly plan yet.</Text>}
        <Pressable accessibilityLabel="Generate weekly plan" onPress={() => makeWeekly.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{makeWeekly.isPending ? "Generating..." : "Generate weekly plan"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Four-week progression</Text>
        {monthly.data?.plan?.weeks?.map((week: any) => <Text key={week.week} style={{ color: theme.text }}>Week {week.week}: {week.phase}</Text>) ?? <Text style={{ color: theme.muted }}>No monthly progression yet.</Text>}
        <Pressable accessibilityLabel="Generate four-week progression" onPress={() => makeMonthly.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{makeMonthly.isPending ? "Generating..." : "Generate progression"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
