import { Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { apiFetch, generateAdvancedPlan, generateMonthlyPlan, generateWeeklyPlan, modifyPlan } from "../../src/api";
import { useTheme } from "../../src/theme";

export default function PlanScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<any>("/plans/weekly/current") });
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<any>("/plans/monthly/current") });
  const advanced = useQuery({ queryKey: ["advanced"], queryFn: () => apiFetch<any>("/plans/advanced/latest") });
  const makeWeekly = useMutation({ mutationFn: generateWeeklyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly"] }) });
  const makeMonthly = useMutation({ mutationFn: generateMonthlyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly"] }) });
  const makeAdvanced = useMutation({ mutationFn: () => generateAdvancedPlan({ available_minutes: 20, target_focuses: ["back", "core"], equipment: ["body weight", "chair"], no_floor: true }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["advanced"] }) });
  const easier = useMutation({ mutationFn: () => modifyPlan(advanced.data?.plan?.id, "make_easier", { pain: 3 }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["advanced"] }) });
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Plan</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["/daily-plan", "Daily"],
          ["/weekly-plan", "Weekly"],
          ["/monthly-plan", "Monthly"],
          ["/calendar", "Calendar"]
        ].map(([href, label]) => (
          <Link key={href} href={href as never} asChild>
            <Pressable accessibilityRole="link" style={{ minHeight: 40, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Advanced safe plan</Text>
        <Text style={{ color: theme.muted }}>Target muscle requests are interpreted, then safety-filtered before selection.</Text>
        <Pressable accessibilityLabel="Generate advanced back and core plan" onPress={() => makeAdvanced.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{makeAdvanced.isPending ? "Generating..." : "Generate back/core no-floor plan"}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Make current plan easier" disabled={!advanced.data?.plan?.id} onPress={() => easier.mutate()} style={{ minHeight: 48, justifyContent: "center", opacity: advanced.data?.plan?.id ? 1 : 0.5 }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{easier.isPending ? "Applying..." : "Make current plan easier"}</Text>
        </Pressable>
      </View>
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
